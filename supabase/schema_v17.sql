-- VYRO database schema — part 17 (Facebook-style multi-type reactions)
-- Run this AFTER schema_v16.sql, once, in Supabase → SQL Editor → New query → paste → Run.

alter table public.post_likes add column if not exists reaction text not null default 'like'
  check (reaction in ('like', 'love', 'haha', 'wow', 'sad', 'angry'));

alter table public.comment_likes add column if not exists reaction text not null default 'like'
  check (reaction in ('like', 'love', 'haha', 'wow', 'sad', 'angry'));
