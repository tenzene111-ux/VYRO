-- VYRO database schema — part 34 (creator subscriptions)
-- Run this AFTER schema_v33.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- Fan subscriptions reuse the existing virtual-coin wallet economy (the
-- same `profiles.coins` balance and `coin_transactions` ledger send_gift()
-- already uses in schema_v2.sql) rather than a real payment processor.
-- A creator sets a monthly coin price on their profile (0 = not offering
-- subscriptions); a fan pays that price once per 30-day period via
-- subscribe_to_creator(), which is a straight coin transfer plus a
-- creator_subscriptions row recording when it lapses. There is no
-- recurring auto-charge — renewing is a fan tapping Subscribe again once
-- renews_at has passed.

alter table public.profiles add column if not exists subscription_price_coins integer not null default 0;

create table if not exists public.creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  coin_cost integer not null,
  started_at timestamptz not null default now(),
  renews_at timestamptz not null,
  unique (subscriber_id, creator_id)
);

alter table public.creator_subscriptions enable row level security;

create policy "subscribers can view their own subscriptions"
  on public.creator_subscriptions for select
  to authenticated
  using (auth.uid() = subscriber_id);

create policy "creators can view their subscribers"
  on public.creator_subscriptions for select
  to authenticated
  using (auth.uid() = creator_id);

-- creator_subscriptions rows and the coin transfer only ever happen
-- together through this function, so no direct insert/update policy is
-- needed — same reasoning as send_gift() in schema_v2.sql.

create or replace function public.subscribe_to_creator(p_creator_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  price integer;
  subscriber_balance integer;
begin
  if p_creator_id = auth.uid() then
    raise exception 'You cannot subscribe to yourself';
  end if;

  select subscription_price_coins into price from public.profiles where id = p_creator_id;
  if price is null or price <= 0 then
    raise exception 'This creator is not offering subscriptions';
  end if;

  select coins into subscriber_balance from public.profiles where id = auth.uid() for update;
  if subscriber_balance is null or subscriber_balance < price then
    raise exception 'Not enough coins';
  end if;

  update public.profiles set coins = coins - price where id = auth.uid();
  update public.profiles set coins = coins + price where id = p_creator_id;

  insert into public.coin_transactions (user_id, delta, reason)
    values (auth.uid(), -price, 'subscription_sent:' || p_creator_id);
  insert into public.coin_transactions (user_id, delta, reason)
    values (p_creator_id, price, 'subscription_received:' || auth.uid());

  insert into public.creator_subscriptions (subscriber_id, creator_id, coin_cost, started_at, renews_at)
    values (auth.uid(), p_creator_id, price, now(), now() + interval '30 days')
    on conflict (subscriber_id, creator_id) do update
      set coin_cost = excluded.coin_cost, started_at = now(), renews_at = now() + interval '30 days';
end;
$$;

-- widened to add the new 'subscription' notification type
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'gift', 'subscription'));

create or replace function public.notify_on_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
    values (new.creator_id, new.subscriber_id, 'subscription');
  return new;
end;
$$;

drop trigger if exists on_creator_subscription on public.creator_subscriptions;
create trigger on_creator_subscription
  after insert on public.creator_subscriptions
  for each row execute procedure public.notify_on_subscription();
