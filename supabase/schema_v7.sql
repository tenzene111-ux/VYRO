-- VYRO database schema — part 7 (real Web Push notifications)
-- Run this AFTER schema.sql through schema_v6.sql, once, in Supabase → SQL Editor → New query → paste → Run.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users manage their own push subscriptions" on public.push_subscriptions;
create policy "users manage their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
