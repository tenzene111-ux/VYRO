-- VYRO database schema — part 35 (lightweight group automation)
-- Run this AFTER schema_v34.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- A real bots/webhooks platform needs externally-hosted compute this
-- environment can't provide, so this is a scoped-down, fully in-database
-- alternative: group owners/admins set (1) an optional welcome message
-- posted when someone joins, and (2) keyword -> reply rules posted when a
-- member's message contains the keyword. Both are plain Postgres triggers —
-- no external hosting, no polling, no webhooks. Auto-replies are sent as
-- the group's creator (there's no separate "bot" identity, since profiles
-- rows require a matching auth.users row we can't create from SQL alone);
-- messages.is_auto_reply marks them so the trigger can tell its own output
-- apart from real messages and never reply to itself.

alter table public.groups add column if not exists welcome_message text;
alter table public.messages add column if not exists is_auto_reply boolean not null default false;

-- groups has no direct update policy (every mutation goes through a
-- security-definer function like update_group_info in schema_v23.sql), so
-- welcome_message needs the same treatment.
create or replace function public.set_group_welcome_message(p_group_id uuid, p_message text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_group_admin_or_owner(p_group_id) then
    raise exception 'Not authorized to edit this group';
  end if;
  update public.groups set welcome_message = nullif(p_message, '') where id = p_group_id;
end;
$$;

create table if not exists public.group_auto_replies (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  keyword text not null,
  reply_text text not null,
  enabled boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.group_auto_replies enable row level security;

create policy "group admins can view auto-reply rules"
  on public.group_auto_replies for select
  to authenticated
  using (public.is_group_admin_or_owner(group_id));

create policy "group admins can create auto-reply rules"
  on public.group_auto_replies for insert
  to authenticated
  with check (public.is_group_admin_or_owner(group_id) and created_by = auth.uid());

create policy "group admins can update auto-reply rules"
  on public.group_auto_replies for update
  to authenticated
  using (public.is_group_admin_or_owner(group_id));

create policy "group admins can delete auto-reply rules"
  on public.group_auto_replies for delete
  to authenticated
  using (public.is_group_admin_or_owner(group_id));

-- posts groups.welcome_message (with {name} replaced) the moment
-- join_group() adds a plain 'member' row — not for the owner's own
-- row inserted by create_group(), and not for role changes (those are
-- updates, not inserts).
create or replace function public.send_group_welcome_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  member_name text;
begin
  if new.role <> 'member' then
    return new;
  end if;

  select id, conversation_id, creator_id, welcome_message into g
    from public.groups where id = new.group_id;
  if g.id is null or g.conversation_id is null or g.welcome_message is null or g.welcome_message = '' then
    return new;
  end if;

  select name into member_name from public.profiles where id = new.user_id;

  insert into public.messages (conversation_id, sender_id, text, is_auto_reply)
    values (g.conversation_id, g.creator_id, replace(g.welcome_message, '{name}', coalesce(member_name, 'there')), true);
  return new;
end;
$$;

drop trigger if exists on_group_member_joined on public.group_members;
create trigger on_group_member_joined
  after insert on public.group_members
  for each row execute procedure public.send_group_welcome_message();

-- posts the reply_text of the longest matching enabled keyword rule for the
-- group a message just landed in. new.is_auto_reply guards against the
-- reply re-triggering itself.
create or replace function public.send_group_auto_reply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  matched_reply text;
begin
  if new.is_auto_reply or new.text is null or new.text = '' then
    return new;
  end if;

  select id, creator_id into g from public.groups where conversation_id = new.conversation_id;
  if g.id is null then
    return new;
  end if;

  select reply_text into matched_reply
    from public.group_auto_replies
    where group_id = g.id and enabled and new.text ilike '%' || keyword || '%'
    order by length(keyword) desc
    limit 1;

  if matched_reply is not null then
    insert into public.messages (conversation_id, sender_id, text, is_auto_reply)
      values (new.conversation_id, g.creator_id, matched_reply, true);
  end if;

  return new;
end;
$$;

drop trigger if exists on_group_message_auto_reply on public.messages;
create trigger on_group_message_auto_reply
  after insert on public.messages
  for each row execute procedure public.send_group_auto_reply();
