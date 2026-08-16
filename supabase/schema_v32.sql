-- VYRO database schema — part 32 (Topics within groups)
-- Run this AFTER schema_v31.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Fully opt-in: a group with zero topics behaves exactly as before (no UI
-- change, messages.topic_id stays null for everyone). Only once an admin
-- creates the first topic does GroupChat show the topic bar. topic_id is
-- pure categorization within a conversation that already has its own
-- message-visibility RLS — it doesn't change who can read/write a message,
-- so the existing messages select/insert policies are untouched.

create table if not exists public.group_topics (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  icon text not null default '💬',
  created_by uuid references public.profiles (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists topic_id uuid references public.group_topics (id) on delete set null;

alter table public.group_topics enable row level security;

create policy "group members can view topics"
  on public.group_topics for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "group admins can create topics"
  on public.group_topics for insert
  to authenticated
  with check (public.is_group_admin_or_owner(group_id) and created_by = auth.uid());

create policy "group admins can delete topics"
  on public.group_topics for delete
  to authenticated
  using (public.is_group_admin_or_owner(group_id));
