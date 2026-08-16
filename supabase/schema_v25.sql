-- VYRO database schema — part 25 (chat polls, and a fix for a real bug in
-- the messages_has_content check constraint)
-- Run this AFTER schema_v24.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- BUG FIX (not new scope): messages_has_content, added back in schema_v6.sql
-- and last updated in schema_v8.sql, requires every message row to have text,
-- an audio_url, or ciphertext. schema_v22.sql then added image/video/file
-- messages that satisfy none of those — so sending a photo/video/file has
-- been failing this check constraint at the database level since v22 was
-- applied. Deleting ANY message ("delete for everyone" / admin moderation)
-- has the same problem: it nulls out every content field at once, which
-- can never satisfy the old constraint either. Both are fixed below by
-- widening the constraint to also accept image_url/video_url/file_url/
-- poll_id, and to always accept a soft-deleted row (deleted_at is not null).

alter table public.messages drop constraint if exists messages_has_content;
alter table public.messages add constraint messages_has_content
  check (
    deleted_at is not null
    or (text is not null and text <> '')
    or audio_url is not null
    or ciphertext is not null
    or image_url is not null
    or video_url is not null
    or file_url is not null
    or poll_id is not null
  );

-- ---------- polls ----------

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  allow_multiple boolean not null default false,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  text text not null,
  position integer not null default 0
);

-- conversation_id is denormalized from polls.conversation_id purely so
-- Realtime can filter vote changes by conversation directly, the same
-- pattern message_reactions already uses.
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, option_id, user_id)
);

alter table public.messages add column if not exists poll_id uuid references public.polls (id) on delete set null;

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "members can view polls in their conversations"
  on public.polls for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "members can view poll options"
  on public.poll_options for select
  to authenticated
  using (exists (select 1 from public.polls p where p.id = poll_options.poll_id and public.is_conversation_member(p.conversation_id)));

create policy "members can view poll votes"
  on public.poll_votes for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

-- writes to polls/poll_options/poll_votes happen only through the
-- security-definer functions below, consistent with group_bans etc.

create or replace function public.create_poll(p_conversation_id uuid, p_question text, p_options text[], p_allow_multiple boolean)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_poll_id uuid;
  opt text;
  idx integer := 0;
begin
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'Not a member of this conversation';
  end if;
  if array_length(p_options, 1) is null or array_length(p_options, 1) < 2 then
    raise exception 'A poll needs at least 2 options';
  end if;

  insert into public.polls (conversation_id, creator_id, question, allow_multiple)
    values (p_conversation_id, auth.uid(), p_question, p_allow_multiple)
    returning id into new_poll_id;

  foreach opt in array p_options loop
    insert into public.poll_options (poll_id, text, position) values (new_poll_id, opt, idx);
    idx := idx + 1;
  end loop;

  return new_poll_id;
end;
$$;

-- passing an empty p_option_ids array retracts the caller's vote entirely
create or replace function public.vote_poll(p_poll_id uuid, p_option_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_conversation_id uuid;
  is_multiple boolean;
  is_closed boolean;
  opt_id uuid;
begin
  select conversation_id, allow_multiple, closed into target_conversation_id, is_multiple, is_closed
    from public.polls where id = p_poll_id;
  if target_conversation_id is null or not public.is_conversation_member(target_conversation_id) then
    raise exception 'Not authorized to vote in this poll';
  end if;
  if is_closed then
    raise exception 'This poll is closed';
  end if;
  if not is_multiple and coalesce(array_length(p_option_ids, 1), 0) > 1 then
    raise exception 'This poll only allows a single choice';
  end if;

  delete from public.poll_votes where poll_id = p_poll_id and user_id = auth.uid();

  foreach opt_id in array p_option_ids loop
    insert into public.poll_votes (poll_id, option_id, user_id, conversation_id)
      values (p_poll_id, opt_id, auth.uid(), target_conversation_id);
  end loop;
end;
$$;

create or replace function public.close_poll(p_poll_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.polls set closed = true where id = p_poll_id and creator_id = auth.uid();
end;
$$;

alter publication supabase_realtime add table public.poll_votes;

-- admin_delete_group_message (schema_v23.sql) nulls out every content field
-- on delete; redefined here to also clear poll_id, consistent with the rest.
create or replace function public.admin_delete_group_message(p_message_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_group_id uuid;
begin
  select g.id into target_group_id
    from public.messages m
    join public.groups g on g.conversation_id = m.conversation_id
    where m.id = p_message_id;
  if target_group_id is null or not public.is_group_admin_or_owner(target_group_id) then
    raise exception 'Not authorized to delete this message';
  end if;
  update public.messages set
    text = null, audio_url = null, audio_duration_seconds = null, ciphertext = null, iv = null,
    image_url = null, video_url = null, file_url = null, file_name = null, file_size = null,
    poll_id = null, pinned = false, deleted_at = now()
  where id = p_message_id;
end;
$$;
