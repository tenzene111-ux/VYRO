-- VYRO database schema — part 28 (Channels: broadcast-only feeds with
-- subscribers, admin-only posting, likes and comments)
-- Run this AFTER schema_v27.sql, once, in Supabase → SQL Editor → New query → paste → Run.
--
-- A channel is not a chat — unlike groups, it has no underlying
-- conversation. It's a broadcast feed: owner/admins post, subscribers view
-- and react/comment but can't post. Permission model mirrors groups
-- (owner > admin > subscriber) but is intentionally simpler since there's
-- no message-level moderation to replicate.

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.channel_subscribers (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'subscriber' check (role in ('owner', 'admin', 'subscriber')),
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.channel_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text,
  image_url text,
  video_url text,
  pinned boolean not null default false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint channel_posts_has_content check (
    deleted_at is not null or (text is not null and text <> '') or image_url is not null or video_url is not null
  )
);

create table if not exists public.channel_post_likes (
  post_id uuid not null references public.channel_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.channel_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.channel_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_channel_subscriber(c_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.channel_subscribers where channel_id = c_id and user_id = auth.uid());
$$;

create or replace function public.is_channel_admin_or_owner(c_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.channel_subscribers
    where channel_id = c_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

alter table public.channels enable row level security;
alter table public.channel_subscribers enable row level security;
alter table public.channel_posts enable row level security;
alter table public.channel_post_likes enable row level security;
alter table public.channel_post_comments enable row level security;

create policy "public channels are visible to everyone, private ones to subscribers"
  on public.channels for select
  to authenticated
  using (privacy = 'public' or public.is_channel_subscriber(id));

create policy "subscriber list follows the same visibility as the channel"
  on public.channel_subscribers for select
  to authenticated
  using (
    exists (select 1 from public.channels c where c.id = channel_id and (c.privacy = 'public' or public.is_channel_subscriber(c.id)))
  );

create policy "posts are visible to whoever can see the channel"
  on public.channel_posts for select
  to authenticated
  using (
    exists (select 1 from public.channels c where c.id = channel_id and (c.privacy = 'public' or public.is_channel_subscriber(c.id)))
  );

create policy "likes are visible to whoever can see the post"
  on public.channel_post_likes for select
  to authenticated
  using (
    exists (
      select 1 from public.channel_posts p join public.channels c on c.id = p.channel_id
      where p.id = post_id and (c.privacy = 'public' or public.is_channel_subscriber(c.id))
    )
  );

create policy "subscribers can like posts"
  on public.channel_post_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.channel_posts p where p.id = post_id and public.is_channel_subscriber(p.channel_id))
  );

create policy "users can unlike their own likes"
  on public.channel_post_likes for delete
  to authenticated
  using (user_id = auth.uid());

create policy "comments are visible to whoever can see the post"
  on public.channel_post_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.channel_posts p join public.channels c on c.id = p.channel_id
      where p.id = post_id and (c.privacy = 'public' or public.is_channel_subscriber(c.id))
    )
  );

create policy "subscribers can comment on posts"
  on public.channel_post_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.channel_posts p where p.id = post_id and public.is_channel_subscriber(p.channel_id))
  );

create policy "users can delete their own comments"
  on public.channel_post_comments for delete
  to authenticated
  using (author_id = auth.uid());

-- writes to channels/channel_subscribers/channel_posts happen only through
-- the security-definer functions below, same pattern as groups.

create or replace function public.create_channel(p_name text, p_description text, p_privacy text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_channel_id uuid;
begin
  insert into public.channels (name, description, privacy, owner_id)
    values (p_name, p_description, coalesce(nullif(p_privacy, ''), 'public'), auth.uid())
    returning id into new_channel_id;
  insert into public.channel_subscribers (channel_id, user_id, role) values (new_channel_id, auth.uid(), 'owner');
  return new_channel_id;
end;
$$;

create or replace function public.join_channel(p_channel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.channel_subscribers (channel_id, user_id) values (p_channel_id, auth.uid())
    on conflict do nothing;
end;
$$;

create or replace function public.leave_channel(p_channel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.channel_subscribers where channel_id = p_channel_id and user_id = auth.uid();
end;
$$;

create or replace function public.promote_channel_admin(p_channel_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.channels where id = p_channel_id and owner_id = auth.uid()) then
    raise exception 'Only the channel owner can promote admins';
  end if;
  update public.channel_subscribers set role = 'admin' where channel_id = p_channel_id and user_id = p_user_id and role = 'subscriber';
end;
$$;

create or replace function public.demote_channel_admin(p_channel_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.channels where id = p_channel_id and owner_id = auth.uid()) then
    raise exception 'Only the channel owner can demote admins';
  end if;
  update public.channel_subscribers set role = 'subscriber' where channel_id = p_channel_id and user_id = p_user_id and role = 'admin';
end;
$$;

create or replace function public.create_channel_post(p_channel_id uuid, p_text text, p_image_url text, p_video_url text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_post_id uuid;
begin
  if not public.is_channel_admin_or_owner(p_channel_id) then
    raise exception 'Only channel owners and admins can post';
  end if;
  insert into public.channel_posts (channel_id, author_id, text, image_url, video_url)
    values (p_channel_id, auth.uid(), nullif(p_text, ''), p_image_url, p_video_url)
    returning id into new_post_id;
  return new_post_id;
end;
$$;

create or replace function public.delete_channel_post(p_post_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_channel_id uuid;
begin
  select channel_id into target_channel_id from public.channel_posts where id = p_post_id;
  if target_channel_id is null or not public.is_channel_admin_or_owner(target_channel_id) then
    raise exception 'Not authorized to delete this post';
  end if;
  update public.channel_posts set text = null, image_url = null, video_url = null, pinned = false, deleted_at = now()
  where id = p_post_id;
end;
$$;

create or replace function public.pin_channel_post(p_channel_id uuid, p_post_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_channel_admin_or_owner(p_channel_id) then
    raise exception 'Not authorized to pin posts in this channel';
  end if;
  update public.channel_posts set pinned = false where channel_id = p_channel_id and pinned = true;
  update public.channel_posts set pinned = true where id = p_post_id and channel_id = p_channel_id;
end;
$$;

create or replace function public.unpin_channel_post(p_post_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_channel_id uuid;
begin
  select channel_id into target_channel_id from public.channel_posts where id = p_post_id;
  if target_channel_id is null or not public.is_channel_admin_or_owner(target_channel_id) then
    raise exception 'Not authorized to unpin this post';
  end if;
  update public.channel_posts set pinned = false where id = p_post_id;
end;
$$;
