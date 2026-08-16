-- VYRO database schema — part 30 (Close Friends for Stories)
-- Run this AFTER schema_v29.sql, once, in Supabase → SQL Editor → New query → paste → Run.

create table if not exists public.close_friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.close_friends enable row level security;

create policy "users can view their own close friends list"
  on public.close_friends for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can add to their own close friends list"
  on public.close_friends for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can remove from their own close friends list"
  on public.close_friends for delete
  to authenticated
  using (user_id = auth.uid());

alter table public.stories add column if not exists audience text not null default 'everyone' check (audience in ('everyone', 'close_friends'));

-- Replaces the schema_v2.sql select policy (same name) to also restrict
-- close_friends-audience stories to the author and whoever is on their
-- close friends list — everyone else's audience='everyone' stories are
-- unaffected.
drop policy if exists "active stories are viewable by authenticated users" on public.stories;
create policy "active stories are viewable by authenticated users"
  on public.stories for select
  to authenticated
  using (
    expires_at > now()
    and (
      audience = 'everyone'
      or author_id = auth.uid()
      or exists (select 1 from public.close_friends cf where cf.user_id = author_id and cf.friend_id = auth.uid())
    )
  );
