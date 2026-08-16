-- VYRO database schema — part 21 (message-level upgrade: reply, edit, delete,
-- pin, react, forward, read receipts)
-- Run this AFTER schema_v20.sql, once, in Supabase → SQL Editor → New query → paste → Run.

alter table public.messages add column if not exists reply_to_id uuid references public.messages (id) on delete set null;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists pinned boolean not null default false;
alter table public.messages add column if not exists forwarded boolean not null default false;

alter table public.conversation_members add column if not exists last_read_at timestamptz not null default now();

-- senders can edit/soft-delete/pin their own messages after the fact
create policy "senders can update their own messages"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid() and public.is_conversation_member(conversation_id))
  with check (sender_id = auth.uid());

-- members can advance their own "last read" pointer (drives read receipts)
create policy "members can update their own read pointer"
  on public.conversation_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- message_reactions ----------
-- conversation_id is denormalized from messages.conversation_id purely so
-- Realtime can filter reaction changes by conversation directly, the same
-- way messages already does, instead of needing a join at subscribe time.

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;

create policy "members can view reactions in their conversations"
  on public.message_reactions for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "members can react as themselves"
  on public.message_reactions for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_conversation_member(conversation_id));

create policy "users can remove their own reactions"
  on public.message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.conversation_members;
