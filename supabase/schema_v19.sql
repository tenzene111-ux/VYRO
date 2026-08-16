-- VYRO database schema — part 19 (dismissable notifications)
-- Run this AFTER schema_v18.sql, once, in Supabase → SQL Editor → New query → paste → Run.

create policy "users can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);
