-- VYRO database schema — part 22 (media sharing in chat: photos, videos, files)
-- Run this AFTER schema_v21.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Media rides the same public "media" storage bucket already used for post
-- images/avatars (schema_v3.sql) — the URL is unlisted (nobody finds it
-- without being sent the link) but not per-member access controlled, same
-- trade-off the rest of the app already makes for uploaded media.

alter table public.messages add column if not exists image_url text;
alter table public.messages add column if not exists video_url text;
alter table public.messages add column if not exists file_url text;
alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists file_size bigint;
