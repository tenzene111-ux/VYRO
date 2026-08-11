-- VYRO database schema — part 2 (all-tab features)
-- Run this AFTER schema.sql, once, in Supabase → SQL Editor → New query → paste → Run.

-- ---------- groups + linked group chat ----------

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create or replace function public.is_group_member(g_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_members where group_id = g_id and user_id = auth.uid()
  );
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "groups are viewable if public or a member"
  on public.groups for select
  to authenticated
  using (privacy = 'public' or public.is_group_member(id));

create policy "group membership is viewable if public or a member"
  on public.group_members for select
  to authenticated
  using (
    public.is_group_member(group_id)
    or exists (select 1 from public.groups g where g.id = group_id and g.privacy = 'public')
  );

-- all group/membership writes go through these functions (security definer,
-- so no direct insert/update/delete policies are needed on either table)

create or replace function public.create_group(p_name text, p_description text, p_privacy text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_group_id uuid;
  new_conv_id uuid;
begin
  insert into public.conversations (is_group, title) values (true, p_name) returning id into new_conv_id;
  insert into public.groups (name, description, privacy, creator_id, conversation_id)
    values (p_name, p_description, coalesce(nullif(p_privacy, ''), 'public'), auth.uid(), new_conv_id)
    returning id into new_group_id;
  insert into public.group_members (group_id, user_id, role) values (new_group_id, auth.uid(), 'owner');
  insert into public.conversation_members (conversation_id, user_id) values (new_conv_id, auth.uid());
  return new_group_id;
end;
$$;

create or replace function public.join_group(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  conv_id uuid;
begin
  insert into public.group_members (group_id, user_id) values (p_group_id, auth.uid())
    on conflict do nothing;
  select conversation_id into conv_id from public.groups where id = p_group_id;
  if conv_id is not null then
    insert into public.conversation_members (conversation_id, user_id) values (conv_id, auth.uid())
      on conflict do nothing;
  end if;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  conv_id uuid;
begin
  select conversation_id into conv_id from public.groups where id = p_group_id;
  delete from public.group_members where group_id = p_group_id and user_id = auth.uid();
  if conv_id is not null then
    delete from public.conversation_members where conversation_id = conv_id and user_id = auth.uid();
  end if;
end;
$$;

-- ---------- marketplace ----------

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  price numeric(12, 2) not null default 0,
  category text,
  created_at timestamptz not null default now()
);

alter table public.marketplace_listings enable row level security;

create policy "listings are viewable by authenticated users"
  on public.marketplace_listings for select
  to authenticated
  using (true);

create policy "users can create their own listings"
  on public.marketplace_listings for insert
  to authenticated
  with check (auth.uid() = seller_id);

create policy "users can delete their own listings"
  on public.marketplace_listings for delete
  to authenticated
  using (auth.uid() = seller_id);

-- ---------- events ----------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create policy "events are viewable by authenticated users"
  on public.events for select
  to authenticated
  using (true);

create policy "users can create their own events"
  on public.events for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "hosts can delete their own events"
  on public.events for delete
  to authenticated
  using (auth.uid() = host_id);

create policy "rsvps are viewable by authenticated users"
  on public.event_rsvps for select
  to authenticated
  using (true);

create policy "users can rsvp as themselves"
  on public.event_rsvps for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own rsvp"
  on public.event_rsvps for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users can remove their own rsvp"
  on public.event_rsvps for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------- stories ----------

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  caption text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

create policy "active stories are viewable by authenticated users"
  on public.stories for select
  to authenticated
  using (expires_at > now());

create policy "users can create their own stories"
  on public.stories for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "users can delete their own stories"
  on public.stories for delete
  to authenticated
  using (auth.uid() = author_id);

create policy "story authors and viewers can see views"
  on public.story_views for select
  to authenticated
  using (
    viewer_id = auth.uid()
    or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );

create policy "users can record their own story view"
  on public.story_views for insert
  to authenticated
  with check (viewer_id = auth.uid());

-- ---------- wallet: virtual coins + gifting ----------

alter table public.profiles add column if not exists coins integer not null default 500;

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gifts_sent (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  gift_key text not null,
  coin_cost integer not null,
  created_at timestamptz not null default now()
);

alter table public.coin_transactions enable row level security;
alter table public.gifts_sent enable row level security;

create policy "users can view their own transactions"
  on public.coin_transactions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can view gifts they sent or received"
  on public.gifts_sent for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- coin balance only ever changes through this function, so no direct
-- insert/update policy is needed on profiles.coins or coin_transactions

create or replace function public.send_gift(p_receiver_id uuid, p_gift_key text, p_coin_cost integer)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sender_balance integer;
begin
  if p_receiver_id = auth.uid() then
    raise exception 'You cannot send a gift to yourself';
  end if;
  if p_coin_cost <= 0 then
    raise exception 'Invalid gift cost';
  end if;

  select coins into sender_balance from public.profiles where id = auth.uid() for update;
  if sender_balance is null or sender_balance < p_coin_cost then
    raise exception 'Not enough coins';
  end if;

  update public.profiles set coins = coins - p_coin_cost where id = auth.uid();
  update public.profiles set coins = coins + p_coin_cost where id = p_receiver_id;

  insert into public.coin_transactions (user_id, delta, reason)
    values (auth.uid(), -p_coin_cost, 'gift_sent:' || p_gift_key);
  insert into public.coin_transactions (user_id, delta, reason)
    values (p_receiver_id, p_coin_cost, 'gift_received:' || p_gift_key);

  insert into public.gifts_sent (sender_id, receiver_id, gift_key, coin_cost)
    values (auth.uid(), p_receiver_id, p_gift_key, p_coin_cost);
end;
$$;

-- ---------- call logs (real 1:1 voice/video calls) ----------

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('voice', 'video')),
  outcome text not null default 'completed' check (outcome in ('completed', 'missed', 'declined')),
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.call_logs enable row level security;

create policy "participants can view their call logs"
  on public.call_logs for select
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "participants can insert their call logs"
  on public.call_logs for insert
  to authenticated
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- ---------- notifications ----------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'gift')),
  post_id uuid references public.posts (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can mark their notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- notifications are otherwise only created by the trigger functions below
-- (and by send_gift() above), all security definer, so no insert policy needed

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
      values (post_author, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_like on public.post_likes;
create trigger on_post_like
  after insert on public.post_likes
  for each row execute procedure public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
      values (post_author, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_comment on public.post_comments;
create trigger on_post_comment
  after insert on public.post_comments
  for each row execute procedure public.notify_on_comment();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type) values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists on_follow on public.follows;
create trigger on_follow
  after insert on public.follows
  for each row execute procedure public.notify_on_follow();

create or replace function public.notify_on_gift()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
    values (new.receiver_id, new.sender_id, 'gift');
  return new;
end;
$$;

drop trigger if exists on_gift_sent on public.gifts_sent;
create trigger on_gift_sent
  after insert on public.gifts_sent
  for each row execute procedure public.notify_on_gift();

alter publication supabase_realtime add table public.notifications;
