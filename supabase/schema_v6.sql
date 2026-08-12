-- VYRO database schema — part 6 (real voice messages)
-- Run this AFTER schema.sql, schema_v2.sql, schema_v3.sql, schema_v4.sql and schema_v5.sql, once,
-- in Supabase → SQL Editor → New query → paste → Run.

alter table public.messages alter column text drop not null;
alter table public.messages alter column text set default '';
alter table public.messages add column if not exists audio_url text;
alter table public.messages add column if not exists audio_duration_seconds numeric;

alter table public.messages drop constraint if exists messages_has_content;
alter table public.messages add constraint messages_has_content
  check ((text is not null and text <> '') or audio_url is not null);
