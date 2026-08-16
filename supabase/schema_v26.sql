-- VYRO database schema — part 26 (chat folders, and a fix for a real bug
-- where group conversations leaked into the 1:1 chat list)
-- Run this AFTER schema_v25.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- BUG FIX (not new scope, found while building this): listConversations —
-- used by the main Chats list, Archived Chats, and both "Forward to..."
-- pickers — never filtered by conversations.is_group. Every group member
-- already gets a conversation_members row for the group's underlying
-- conversation (see join_group), so group chats were showing up in the
-- personal chat list too, rendered as a fake 1:1 chat using whichever other
-- member happened to be picked last, and tapping it opened the wrong screen
-- (1:1 Conversation instead of GroupChat). Groups already have their own
-- listing (GroupsTab, via listMyGroups) — this is fixed client-side in
-- api.ts by excluding is_group conversations from listConversations. No
-- schema change is needed for that part; noted here since it surfaced while
-- adding the is_group column read this file relies on.

create table if not exists public.chat_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  icon text not null default 'folder',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_folder_conversations (
  folder_id uuid not null references public.chat_folders (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  primary key (folder_id, conversation_id)
);

alter table public.chat_folders enable row level security;
alter table public.chat_folder_conversations enable row level security;

-- Pure per-user ownership (no shared/multi-member access like groups), so a
-- single "for all" policy is enough instead of the RPC-only pattern used
-- for group moderation elsewhere.
create policy "users can manage their own folders"
  on public.chat_folders for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can manage their own folder contents"
  on public.chat_folder_conversations for all
  to authenticated
  using (exists (select 1 from public.chat_folders f where f.id = folder_id and f.user_id = auth.uid()))
  with check (exists (select 1 from public.chat_folders f where f.id = folder_id and f.user_id = auth.uid()));
