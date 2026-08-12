-- VYRO database schema — part 9 (real passkey / biometric login via WebAuthn)
-- Run this AFTER schema.sql through schema_v8.sql, once, in Supabase → SQL Editor → New query → paste → Run.

create table if not exists public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean not null default false,
  transports text[],
  name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.passkeys enable row level security;

drop policy if exists "users can view their own passkeys" on public.passkeys;
create policy "users can view their own passkeys"
  on public.passkeys for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can delete their own passkeys" on public.passkeys;
create policy "users can delete their own passkeys"
  on public.passkeys for delete
  to authenticated
  using (user_id = auth.uid());

-- Note: intentionally no insert/update policy — passkeys are only ever written by the
-- webauthn-register Edge Function (via service_role) after real cryptographic
-- verification, never directly by a client.

-- Short-lived, single-use WebAuthn challenges. Only ever touched by Edge Functions
-- via service_role, so no client-facing RLS policies are defined (fully locked down).
create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  challenge text not null,
  created_at timestamptz not null default now()
);

alter table public.webauthn_challenges enable row level security;
