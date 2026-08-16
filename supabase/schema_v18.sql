-- VYRO database schema — part 18 (edit posts, delete own comments already existed)
-- Run this AFTER schema_v17.sql, once, in Supabase → SQL Editor → New query → paste → Run.

alter table public.posts add column if not exists edited_at timestamptz;

create policy "users can update their own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
