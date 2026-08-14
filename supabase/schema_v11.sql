-- VYRO database schema — part 11 (group chat end-to-end encryption)
-- Run this AFTER schema_v10.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Design: one random AES-256 key per group ("the group key"), generated client-side
-- and never sent to the server in the clear. To grant a member access, an existing
-- key holder derives a per-pair ECDH shared secret with that member's public key
-- (profiles.public_key_jwk, the same per-device key used for 1:1 DM encryption) and
-- uses it to AES-wrap the raw group key. Each member's wrapped copy is stored as its
-- own row — decryptable only by that member's own private key, which never leaves
-- their device. Group messages then reuse messages.ciphertext/iv, encrypted with the
-- shared group key instead of a per-conversation pairwise key.
--
-- Honest limitation: like the DM encryption, this is static (no forward secrecy — a
-- captured device key decrypts all past/future group traffic), and there is no key
-- rotation when a member leaves (a removed member's device could still decrypt
-- messages sent after they left, until the group is manually re-keyed by a future
-- feature). New members are granted access lazily, the next time an existing key
-- holder opens the chat — not instantly at join time.

alter table public.groups add column if not exists encrypted boolean not null default false;

create table if not exists public.group_keys (
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  wrapped_key text not null,
  wrapped_iv text not null,
  wrapper_public_key_jwk jsonb not null,
  created_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

alter table public.group_keys enable row level security;

-- wrapped_key is only decryptable by the target member's own private key (or the
-- wrapper's), so it's safe for any fellow group member to read — this lets clients
-- diff "who already has a key" against the member list to grant latecomers access.
create policy "group members can read group key wraps"
  on public.group_keys for select
  to authenticated
  using (
    exists (select 1 from public.group_members gm where gm.group_id = group_keys.group_id and gm.user_id = auth.uid())
  );

create policy "group members can wrap the key for fellow members"
  on public.group_keys for insert
  to authenticated
  with check (
    exists (select 1 from public.group_members gm where gm.group_id = group_keys.group_id and gm.user_id = auth.uid())
    and exists (select 1 from public.group_members gm2 where gm2.group_id = group_keys.group_id and gm2.user_id = group_keys.member_id)
  );

create or replace function public.enable_group_encryption(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = auth.uid()) then
    raise exception 'not a member of this group';
  end if;
  update public.groups set encrypted = true where id = p_group_id;
end;
$$;
