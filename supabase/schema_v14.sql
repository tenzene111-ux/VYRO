-- VYRO database schema — part 14 (Community + Rewards)
-- Run this AFTER schema_v13.sql, once, in Supabase → SQL Editor → New query → paste → Run.

-- ========================= COMMUNITY =========================

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  logo_url text,
  category text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.posts add column if not exists community_id uuid references public.communities (id) on delete set null;

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

create policy "communities are readable by everyone"
  on public.communities for select
  to authenticated
  using (true);

create policy "authenticated users can create communities"
  on public.communities for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "community members are readable by everyone"
  on public.community_members for select
  to authenticated
  using (true);

-- Replace the plain "own posts only" insert policy with one that also requires
-- community membership when a post is tagged with a community_id. Combining both
-- checks in a single policy (rather than adding a second permissive policy) matters:
-- Postgres OR's multiple permissive policies together, which would otherwise let
-- anyone insert a post as a different author_id as long as community_id was null.
drop policy if exists "users can create their own posts" on public.posts;
create policy "users can create their own posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      community_id is null
      or exists (
        select 1 from public.community_members m
        where m.community_id = posts.community_id and m.user_id = auth.uid()
      )
    )
  );

create or replace function public.create_community(
  p_name text, p_description text, p_category text, p_cover_url text, p_logo_url text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.communities (name, description, category, cover_url, logo_url, created_by)
    values (p_name, p_description, p_category, p_cover_url, p_logo_url, auth.uid())
    returning id into new_id;
  insert into public.community_members (community_id, user_id, role) values (new_id, auth.uid(), 'admin');
  return new_id;
end;
$$;

create or replace function public.join_community(p_community_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.community_members (community_id, user_id) values (p_community_id, auth.uid())
    on conflict (community_id, user_id) do nothing;
end;
$$;

create or replace function public.leave_community(p_community_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.community_members where community_id = p_community_id and user_id = auth.uid();
end;
$$;

-- ========================= REWARDS =========================

create table if not exists public.daily_checkins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  checkin_date date not null,
  streak_count integer not null default 1,
  reward_coins integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);

alter table public.daily_checkins enable row level security;

create policy "users can read their own checkins"
  on public.daily_checkins for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.claim_daily_checkin()
returns table (streak integer, reward integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_prev_streak integer;
  v_new_streak integer;
  v_reward integer;
begin
  if exists (select 1 from public.daily_checkins where user_id = auth.uid() and checkin_date = now()::date) then
    raise exception 'Already checked in today';
  end if;

  select streak_count into v_prev_streak from public.daily_checkins
    where user_id = auth.uid() and checkin_date = (now()::date - 1);

  v_new_streak := coalesce(v_prev_streak, 0) + 1;
  v_reward := 10;

  insert into public.daily_checkins (user_id, checkin_date, streak_count, reward_coins)
    values (auth.uid(), now()::date, v_new_streak, v_reward);

  update public.profiles set coins = coins + v_reward where id = auth.uid();
  insert into public.coin_transactions (user_id, delta, reason) values (auth.uid(), v_reward, 'reward:daily_checkin');

  return query select v_new_streak, v_reward;
end;
$$;

-- Referrals: referred_by is captured at signup (see handle_new_user below) from a
-- ?ref=<username> link. Both sides get a one-time coin bonus once, via trigger.

alter table public.profiles add column if not exists referred_by uuid references public.profiles (id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

alter table public.referrals enable row level security;

create policy "users can read referrals they're part of"
  on public.referrals for select
  to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid());

create or replace function public.reward_referral()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.referred_by is not null and new.referred_by <> new.id then
    insert into public.referrals (referrer_id, referred_id) values (new.referred_by, new.id)
      on conflict (referred_id) do nothing;
    update public.profiles set coins = coins + 100 where id = new.referred_by;
    update public.profiles set coins = coins + 50 where id = new.id;
    insert into public.coin_transactions (user_id, delta, reason) values (new.referred_by, 100, 'reward:referral_bonus');
    insert into public.coin_transactions (user_id, delta, reason) values (new.id, 50, 'reward:referral_welcome');
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_referred on public.profiles;
create trigger on_profile_referred
  after insert on public.profiles
  for each row execute procedure public.reward_referral();

-- Pick up a referral code (?ref=<username>) passed through signup metadata as
-- "referred_by_username", resolved to a profile id here (server-side, so the
-- client never sets referred_by directly).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  desired_username text := coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1));
  desired_name text := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
  referrer uuid;
begin
  select id into referrer from public.profiles
    where username = nullif(new.raw_user_meta_data->>'referred_by_username', '');

  begin
    insert into public.profiles (id, username, name, referred_by)
    values (new.id, desired_username, desired_name, referrer);
  exception when unique_violation then
    insert into public.profiles (id, username, name, referred_by)
    values (new.id, desired_username || '_' || substr(new.id::text, 1, 6), desired_name, referrer);
  end;
  return new;
end;
$$;

-- Reward creating a post (capped at the first 3 per day to discourage spam-for-coins).
create or replace function public.reward_post_creation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  today_count integer;
begin
  select count(*) into today_count from public.posts
    where author_id = new.author_id and created_at::date = now()::date;
  if today_count <= 3 then
    update public.profiles set coins = coins + 20 where id = new.author_id;
    insert into public.coin_transactions (user_id, delta, reason) values (new.author_id, 20, 'reward:create_post');
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_created_reward on public.posts;
create trigger on_post_created_reward
  after insert on public.posts
  for each row execute procedure public.reward_post_creation();

-- Reward completed video watches (capped at the first 5 per day).
create or replace function public.reward_video_watch()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  today_count integer;
begin
  if not new.completed then
    return new;
  end if;
  select count(*) into today_count from public.video_watch_events
    where viewer_id = new.viewer_id and completed = true and created_at::date = now()::date;
  if today_count <= 5 then
    update public.profiles set coins = coins + 5 where id = new.viewer_id;
    insert into public.coin_transactions (user_id, delta, reason) values (new.viewer_id, 5, 'reward:watch_video');
  end if;
  return new;
end;
$$;

drop trigger if exists on_video_watch_reward on public.video_watch_events;
create trigger on_video_watch_reward
  after insert on public.video_watch_events
  for each row execute procedure public.reward_video_watch();
