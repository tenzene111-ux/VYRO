-- VYRO database schema — part 15 (Reports + Admin dashboard)
-- Run this AFTER schema_v14.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- After running, promote your own account to admin manually (the app has no
-- self-service "become admin" button, on purpose):
--   update public.profiles set is_admin = true where username = 'your_username';

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended', 'banned'));

-- security definer so it can be called from RLS policies on other tables without
-- those policies needing their own select-access into profiles to check the flag.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'user', 'comment', 'live_stream', 'marketplace_listing', 'community')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "users can file their own reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "reporters see their own reports, admins see all"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "only admins can update reports"
  on public.reports for update
  to authenticated
  using (public.is_admin());

-- Admins act through RPCs (not direct table writes) so every moderation action is
-- funneled through one auditable, admin-gated path.

create or replace function public.admin_resolve_report(p_report_id uuid, p_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('actioned', 'dismissed') then
    raise exception 'Invalid status';
  end if;
  update public.reports set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_report_id;
end;
$$;

create or replace function public.admin_delete_post(p_post_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  delete from public.posts where id = p_post_id;
end;
$$;

create or replace function public.admin_set_user_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('active', 'suspended', 'banned') then
    raise exception 'Invalid status';
  end if;
  update public.profiles set status = p_status where id = p_user_id;
end;
$$;

-- Admins can browse all profiles' moderation-relevant fields (the existing
-- "profiles are viewable by everyone" select policy already covers this — no
-- change needed there since profiles are public read already).
