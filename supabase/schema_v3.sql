-- VYRO database schema — part 3 (real photo uploads)
-- Run this AFTER schema.sql and schema_v2.sql, once, in Supabase → SQL Editor → New query → paste → Run.

-- ---------- storage bucket for post images and avatars ----------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media is publicly readable" on storage.objects;
create policy "media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "users can upload their own media" on storage.objects;
create policy "users can upload their own media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can update their own media" on storage.objects;
create policy "users can update their own media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete their own media" on storage.objects;
create policy "users can delete their own media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- image columns ----------

alter table public.posts add column if not exists image_url text;
alter table public.profiles add column if not exists avatar_url text;
