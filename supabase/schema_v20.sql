-- VYRO database schema — part 20 (For You: replay signal for watch events)
-- Run this AFTER schema_v19.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- video_watch_events already records watch time + completion (schema_v13) for
-- creator analytics. This adds a "replayed" flag so the For You ranking engine
-- can treat a rewatched video as a much stronger interest signal than a single
-- pass, same as watch time and completion already are.

alter table public.video_watch_events add column if not exists replayed boolean not null default false;
