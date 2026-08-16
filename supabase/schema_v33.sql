-- VYRO database schema — part 33 (stickers)
-- Run this AFTER schema_v32.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Stickers are a curated built-in emoji set rendered large and borderless
-- (no bubble chrome), sent as their own message content type — no external
-- API key or storage bucket needed. Reuses the existing messages table and
-- conversation/group RLS, since a sticker is just another content shape.

alter table public.messages add column if not exists sticker_emoji text;

-- widened (again) to accept sticker_emoji — see schema_v25.sql's note for
-- why this constraint has to be touched every time a new message content
-- type is added.
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
    or location_lat is not null
    or shared_profile_id is not null
    or sticker_emoji is not null
  );

-- admin_delete_group_message (schema_v23.sql, last touched in v27) nulls out
-- every content field on delete; redefined again to also clear sticker_emoji.
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
    poll_id = null, location_lat = null, location_lng = null, location_label = null,
    shared_profile_id = null, sticker_emoji = null, pinned = false, deleted_at = now()
  where id = p_message_id;
end;
$$;
