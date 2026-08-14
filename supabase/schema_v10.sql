-- VYRO database schema — part 10 (real saved/bookmarked posts)
-- Run this AFTER schema.sql through schema_v9.sql, once, in Supabase → SQL Editor → New query → paste → Run.

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;

drop policy if exists "users manage their own saved posts" on public.saved_posts;
create policy "users manage their own saved posts"
  on public.saved_posts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
