-- VYRO database schema — part 31 (Story Highlights)
-- Run this AFTER schema_v30.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- A highlight item is a snapshot of a story's media/caption at the moment
-- it's added — not a live reference to the `stories` row, which expires and
-- becomes unreadable via RLS 24h later. Highlights are meant to outlive
-- that, so they carry their own copy, same reasoning as the story-reply
-- preview fields added on `messages` in schema_v29.sql.
--
-- Visibility: highlights are public showcases on a profile, visible to any
-- authenticated user regardless of the original story's audience — matches
-- how profiles and posts already have no account-level privacy in this app.

create table if not exists public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  cover_image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.story_highlight_items (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.story_highlights (id) on delete cascade,
  image_url text,
  video_url text,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint story_highlight_items_has_content check (image_url is not null or video_url is not null)
);

alter table public.story_highlights enable row level security;
alter table public.story_highlight_items enable row level security;

create policy "highlights are visible to everyone"
  on public.story_highlights for select
  to authenticated
  using (true);

create policy "owners manage their own highlights"
  on public.story_highlights for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "highlight items are visible to everyone"
  on public.story_highlight_items for select
  to authenticated
  using (true);

create policy "owners manage their own highlight items"
  on public.story_highlight_items for all
  to authenticated
  using (exists (select 1 from public.story_highlights h where h.id = highlight_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from public.story_highlights h where h.id = highlight_id and h.owner_id = auth.uid()));
