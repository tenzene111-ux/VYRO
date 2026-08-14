-- VYRO database schema — part 13 (creator analytics: video watch events + retention)
-- Run this AFTER schema_v12.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Each row is one "watch session" for a video post: the furthest point (in seconds)
-- a viewer reached before scrolling away, recorded once when the video tile leaves
-- view. Creator Studio aggregates these into view counts, average watch time, and an
-- audience retention curve (bucketed by "% of viewers who reached at least this point
-- in the video") — the same shape as watch-time retention graphs in other apps, built
-- from real per-viewer data rather than mocked numbers.

create table if not exists public.video_watch_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  watched_seconds numeric not null default 0,
  video_duration_seconds numeric,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.video_watch_events enable row level security;

create policy "viewers record their own watch events"
  on public.video_watch_events for insert
  to authenticated
  with check (viewer_id = auth.uid());

create policy "viewers and post authors can read watch events"
  on public.video_watch_events for select
  to authenticated
  using (
    viewer_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );
