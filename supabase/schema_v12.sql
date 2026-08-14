-- VYRO database schema — part 12 (Duet / Stitch lineage for short videos)
-- Run this AFTER schema_v11.sql, once, in Supabase → SQL Editor → New query → paste → Run.

alter table public.posts add column if not exists remix_type text check (remix_type in ('duet', 'stitch'));
alter table public.posts add column if not exists remix_of_post_id uuid references public.posts (id) on delete set null;
