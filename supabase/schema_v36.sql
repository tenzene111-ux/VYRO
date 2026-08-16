-- VYRO database schema — part 36 (bug fix: live gifts never reached anyone)
-- Run this AFTER schema_v35.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Two separate bugs, both in the live-gifting path added by schema_v4.sql:
--
-- 1. public.gifts_sent was never added to the supabase_realtime publication,
--    so subscribeToLiveGifts()'s postgres_changes subscription (api.ts) never
--    fired for anyone — the coin transfer in send_gift() always completed
--    correctly server-side, but the on-screen "X sent a gift" toast never
--    appeared for the host or any viewer.
--
-- 2. Even once realtime delivery works, the existing select policy ("users
--    can view gifts they sent or received", schema_v2.sql) means Realtime
--    would still only deliver a gift event to the two people directly
--    involved — every OTHER viewer in the room (who is neither sender nor
--    receiver) would still see nothing, even though live gifts are meant to
--    be a shared, public moment for the whole room. Adds a second select
--    policy scoped to live_id using the same can_view_live() privacy check
--    live_messages already uses (schema_v4.sql), so it only affects
--    gifts sent during a live and leaves plain profile-to-profile gifting
--    exactly as private as before.

alter publication supabase_realtime add table public.gifts_sent;

create policy "live gifts are visible to anyone who can view that live"
  on public.gifts_sent for select
  to authenticated
  using (live_id is not null and public.can_view_live(live_id));
