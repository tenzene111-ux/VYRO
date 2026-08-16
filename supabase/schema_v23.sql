-- VYRO database schema — part 23 (group admin: roles, member management, bans)
-- Run this AFTER schema_v22.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Permission model: Owner can do everything (promote/demote admins, remove or
-- ban anyone but themself, edit group info, delete any message). Admins can
-- remove/ban regular members (not the owner or other admins), edit group
-- info, and delete any message. Members have no admin powers. All writes go
-- through security-definer functions, consistent with the rest of groups.

create or replace function public.is_group_admin_or_owner(g_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = g_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

create table if not exists public.group_bans (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  banned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_bans enable row level security;

create policy "group admins can view the ban list"
  on public.group_bans for select
  to authenticated
  using (public.is_group_admin_or_owner(group_id));

-- writes to group_bans happen only through ban_group_member/unban_group_member below

create or replace function public.promote_group_admin(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only the group owner can promote admins';
  end if;
  update public.group_members set role = 'admin' where group_id = p_group_id and user_id = p_user_id and role = 'member';
end;
$$;

create or replace function public.demote_group_admin(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only the group owner can demote admins';
  end if;
  update public.group_members set role = 'member' where group_id = p_group_id and user_id = p_user_id and role = 'admin';
end;
$$;

create or replace function public.remove_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role text;
  target_role text;
  conv_id uuid;
begin
  select role into caller_role from public.group_members where group_id = p_group_id and user_id = auth.uid();
  select role into target_role from public.group_members where group_id = p_group_id and user_id = p_user_id;
  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'Not authorized to remove members';
  end if;
  if target_role = 'owner' then
    raise exception 'The group owner cannot be removed';
  end if;
  if caller_role = 'admin' and target_role = 'admin' then
    raise exception 'Admins cannot remove other admins';
  end if;

  delete from public.group_members where group_id = p_group_id and user_id = p_user_id;
  select conversation_id into conv_id from public.groups where id = p_group_id;
  if conv_id is not null then
    delete from public.conversation_members where conversation_id = conv_id and user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.ban_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.remove_group_member(p_group_id, p_user_id);
  insert into public.group_bans (group_id, user_id, banned_by) values (p_group_id, p_user_id, auth.uid())
    on conflict (group_id, user_id) do nothing;
end;
$$;

create or replace function public.unban_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_group_admin_or_owner(p_group_id) then
    raise exception 'Not authorized to unban members';
  end if;
  delete from public.group_bans where group_id = p_group_id and user_id = p_user_id;
end;
$$;

create or replace function public.update_group_info(p_group_id uuid, p_name text, p_description text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_group_admin_or_owner(p_group_id) then
    raise exception 'Not authorized to edit this group';
  end if;
  update public.groups set name = coalesce(nullif(p_name, ''), name), description = p_description where id = p_group_id;
end;
$$;

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
    pinned = false, deleted_at = now()
  where id = p_message_id;
end;
$$;

-- reject rejoining if banned
create or replace function public.join_group(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  conv_id uuid;
begin
  if exists (select 1 from public.group_bans where group_id = p_group_id and user_id = auth.uid()) then
    raise exception 'You have been banned from this group';
  end if;
  insert into public.group_members (group_id, user_id) values (p_group_id, auth.uid())
    on conflict do nothing;
  select conversation_id into conv_id from public.groups where id = p_group_id;
  if conv_id is not null then
    insert into public.conversation_members (conversation_id, user_id) values (conv_id, auth.uid())
      on conflict do nothing;
  end if;
end;
$$;
