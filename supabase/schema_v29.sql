-- VYRO database schema — part 29 (Stories: photo/video content, viewer
-- list, and story-linked replies)
-- Run this AFTER schema_v28.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Stories today (schema_v2.sql) are caption-only text cards, and replying
-- (including the heart quick-react) sends a plain DM with zero link back to
-- the story it came from. This file adds real photo/video content, and
-- gives replies a proper story_id + a denormalized preview snapshot on the
-- message itself (not a live join to `stories`, since a story's RLS select
-- policy only allows reading it while `expires_at > now()` — a reply sent
-- today needs to keep rendering its story-preview thumbnail correctly even
-- after that story expires 24h later, so the preview is captured at
-- send-time instead of looked up live).

alter table public.stories alter column caption drop not null;
alter table public.stories add column if not exists image_url text;
alter table public.stories add column if not exists video_url text;

alter table public.stories drop constraint if exists stories_has_content;
alter table public.stories add constraint stories_has_content
  check ((caption is not null and caption <> '') or image_url is not null or video_url is not null);

alter table public.messages add column if not exists story_id uuid references public.stories (id) on delete set null;
alter table public.messages add column if not exists story_preview_image_url text;
alter table public.messages add column if not exists story_preview_text text;
