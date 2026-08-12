-- VYRO database schema — part 8 (real end-to-end encrypted 1:1 DMs)
-- Run this AFTER schema.sql through schema_v7.sql, once, in Supabase → SQL Editor → New query → paste → Run.

alter table public.profiles add column if not exists public_key_jwk jsonb;

alter table public.messages add column if not exists ciphertext text;
alter table public.messages add column if not exists iv text;
alter table public.messages add column if not exists sender_public_key_jwk jsonb;
alter table public.messages add column if not exists recipient_public_key_jwk jsonb;

alter table public.messages drop constraint if exists messages_has_content;
alter table public.messages add constraint messages_has_content
  check (
    (text is not null and text <> '')
    or audio_url is not null
    or ciphertext is not null
  );
