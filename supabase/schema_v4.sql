-- VYRO database schema — part 4 (real live streaming)
-- Run this AFTER schema.sql, schema_v2.sql and schema_v3.sql, once, in Supabase → SQL Editor → New query → paste → Run.

-- ---------- live sessions ----------

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category text not null default 'chat',
  privacy text not null default 'public' check (privacy in ('public', 'followers', 'private')),
  status text not null default 'created'
    check (status in ('created', 'preparing', 'live', 'reconnecting', 'ending', 'ended', 'processing', 'replay_ready', 'deleted')),
  room_name text not null unique default gen_random_uuid()::text,
  started_at timestamptz,
  ended_at timestamptz,
  peak_viewers integer not null default 0,
  replay_url text,
  replay_ready boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- co-host / guests (declared early: referenced by can_view_live) ----------

create table if not exists public.live_guests (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.live_sessions (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'removed', 'ended')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  left_at timestamptz
);

create or replace function public.is_live_host(l_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.live_sessions where id = l_id and host_id = auth.uid());
$$;

create or replace function public.can_view_live(l_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  ls record;
begin
  select * into ls from public.live_sessions where id = l_id;
  if ls is null then
    return false;
  end if;
  if ls.host_id = auth.uid() then
    return true;
  end if;
  if ls.privacy = 'public' then
    return true;
  elsif ls.privacy = 'followers' then
    return exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = ls.host_id
    );
  elsif ls.privacy = 'private' then
    return exists (
      select 1 from public.live_guests g where g.live_id = ls.id and g.guest_id = auth.uid() and g.status = 'accepted'
    );
  end if;
  return false;
end;
$$;

alter table public.live_sessions enable row level security;
alter table public.live_guests enable row level security;

create policy "lives are viewable by host or per privacy"
  on public.live_sessions for select
  to authenticated
  using (host_id = auth.uid() or (status <> 'deleted' and public.can_view_live(id)));

create policy "users can create their own live session"
  on public.live_sessions for insert
  to authenticated
  with check (host_id = auth.uid());

create policy "hosts can update their own live session"
  on public.live_sessions for update
  to authenticated
  using (host_id = auth.uid());

create policy "guests are viewable by host, self, or live viewers"
  on public.live_guests for select
  to authenticated
  using (public.is_live_host(live_id) or guest_id = auth.uid() or public.can_view_live(live_id));

create policy "hosts invite guests"
  on public.live_guests for insert
  to authenticated
  with check (public.is_live_host(live_id));

create policy "host or guest can update invite status"
  on public.live_guests for update
  to authenticated
  using (public.is_live_host(live_id) or guest_id = auth.uid());

-- ---------- viewer sessions (for real analytics) ----------

create table if not exists public.live_viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.live_sessions (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

alter table public.live_viewer_sessions enable row level security;

create policy "viewer sessions visible to self or host"
  on public.live_viewer_sessions for select
  to authenticated
  using (viewer_id = auth.uid() or public.is_live_host(live_id));

create policy "viewers record their own session"
  on public.live_viewer_sessions for insert
  to authenticated
  with check (viewer_id = auth.uid());

create policy "viewers update their own session"
  on public.live_viewer_sessions for update
  to authenticated
  using (viewer_id = auth.uid());

-- ---------- blocked viewers ----------

create table if not exists public.live_blocked_viewers (
  live_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (live_id, user_id)
);

alter table public.live_blocked_viewers enable row level security;

create policy "blocklist visible to host or the blocked user"
  on public.live_blocked_viewers for select
  to authenticated
  using (public.is_live_host(live_id) or user_id = auth.uid());

create policy "hosts block viewers"
  on public.live_blocked_viewers for insert
  to authenticated
  with check (public.is_live_host(live_id));

create policy "hosts unblock viewers"
  on public.live_blocked_viewers for delete
  to authenticated
  using (public.is_live_host(live_id));

-- ---------- live chat ----------

create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.live_sessions (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.live_messages enable row level security;

create policy "live chat visible to anyone who can view the live"
  on public.live_messages for select
  to authenticated
  using (public.can_view_live(live_id));

create policy "non-blocked viewers can send live chat"
  on public.live_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_view_live(live_id)
    and not exists (
      select 1 from public.live_blocked_viewers b where b.live_id = live_messages.live_id and b.user_id = auth.uid()
    )
  );

create policy "host can pin or moderate messages"
  on public.live_messages for update
  to authenticated
  using (public.is_live_host(live_id));

create policy "host or author can delete a message"
  on public.live_messages for delete
  to authenticated
  using (public.is_live_host(live_id) or sender_id = auth.uid());

-- ---------- polls ----------

create table if not exists public.live_polls (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.live_sessions (id) on delete cascade,
  question text not null,
  options jsonb not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.live_poll_votes (
  poll_id uuid not null references public.live_polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.live_polls enable row level security;
alter table public.live_poll_votes enable row level security;

create policy "polls visible to live viewers"
  on public.live_polls for select
  to authenticated
  using (public.can_view_live(live_id));

create policy "hosts create polls"
  on public.live_polls for insert
  to authenticated
  with check (public.is_live_host(live_id));

create policy "hosts close polls"
  on public.live_polls for update
  to authenticated
  using (public.is_live_host(live_id));

create policy "votes visible to live viewers"
  on public.live_poll_votes for select
  to authenticated
  using (exists (select 1 from public.live_polls p where p.id = poll_id and public.can_view_live(p.live_id)));

create policy "viewers vote as themselves"
  on public.live_poll_votes for insert
  to authenticated
  with check (user_id = auth.uid());

-- ---------- reports ----------

create table if not exists public.live_reports (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.live_sessions (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table public.live_reports enable row level security;

create policy "reporters can view their own reports"
  on public.live_reports for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "viewers can file a report"
  on public.live_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ---------- gifts get live context ----------

alter table public.gifts_sent add column if not exists live_id uuid references public.live_sessions (id) on delete set null;

create or replace function public.send_gift(
  p_receiver_id uuid,
  p_gift_key text,
  p_coin_cost integer,
  p_live_id uuid default null
)
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

  insert into public.gifts_sent (sender_id, receiver_id, gift_key, coin_cost, live_id)
    values (auth.uid(), p_receiver_id, p_gift_key, p_coin_cost, p_live_id);
end;
$$;

-- ---------- live match / battle ----------

create table if not exists public.live_matches (
  id uuid primary key default gen_random_uuid(),
  live_id_a uuid not null references public.live_sessions (id) on delete cascade,
  live_id_b uuid not null references public.live_sessions (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('pending', 'active', 'ended')),
  winner_live_id uuid references public.live_sessions (id)
);

alter table public.live_matches enable row level security;

create policy "matches visible to viewers of either side"
  on public.live_matches for select
  to authenticated
  using (public.can_view_live(live_id_a) or public.can_view_live(live_id_b));

create policy "either host can start a match"
  on public.live_matches for insert
  to authenticated
  with check (public.is_live_host(live_id_a) or public.is_live_host(live_id_b));

create policy "either host can update the match"
  on public.live_matches for update
  to authenticated
  using (public.is_live_host(live_id_a) or public.is_live_host(live_id_b));

create or replace function public.get_match_score(p_match_id uuid)
returns table (score_a bigint, score_b bigint)
language plpgsql
security definer
stable
as $$
declare
  m record;
begin
  select * into m from public.live_matches where id = p_match_id;
  return query
  select
    coalesce((
      select sum(coin_cost) from public.gifts_sent
      where live_id = m.live_id_a and created_at between m.started_at and m.ends_at
    ), 0)::bigint,
    coalesce((
      select sum(coin_cost) from public.gifts_sent
      where live_id = m.live_id_b and created_at between m.started_at and m.ends_at
    ), 0)::bigint;
end;
$$;

-- ---------- realtime ----------

alter publication supabase_realtime add table public.live_messages;
alter publication supabase_realtime add table public.live_polls;
alter publication supabase_realtime add table public.live_poll_votes;
alter publication supabase_realtime add table public.live_guests;
alter publication supabase_realtime add table public.live_sessions;
alter publication supabase_realtime add table public.live_matches;
