-- VYRO database schema — part 24 (Saved Messages + Archived Chats)
-- Run this AFTER schema_v23.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Saved Messages is just a conversation with exactly one member (the owner),
-- flagged is_self so the UI can render it specially ("Saved Messages" instead
-- of another person's name/avatar) and skip E2E key exchange, which has no
-- meaning for a conversation with yourself. No new RLS is needed: the
-- existing "start a conversation" (with check (true)) and "add themselves"
-- policies already allow a user to create a conversation containing only
-- their own membership row.
--
-- Archived is a per-member flag (I can archive a chat without affecting what
-- the other person sees), so it lives on conversation_members. The existing
-- "members can update their own read pointer" policy from schema_v21 already
-- permits updating any column of a member's own row, so no new policy is
-- needed there either.

alter table public.conversations add column if not exists is_self boolean not null default false;
alter table public.conversation_members add column if not exists archived boolean not null default false;
