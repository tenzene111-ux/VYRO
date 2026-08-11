-- VYRO database schema
-- Run this once in Supabase → SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

-- ---------- profiles ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  name text not null,
  bio text,
  location text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  desired_username text := coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1));
  desired_name text := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
begin
  begin
    insert into public.profiles (id, username, name)
    values (new.id, desired_username, desired_name);
  exception when unique_violation then
    insert into public.profiles (id, username, name)
    values (new.id, desired_username || '_' || substr(new.id::text, 1, 6), desired_name);
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- posts ----------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts are viewable by authenticated users"
  on public.posts for select
  to authenticated
  using (true);

create policy "users can create their own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

-- ---------- post_likes ----------

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "likes are viewable by authenticated users"
  on public.post_likes for select
  to authenticated
  using (true);

create policy "users can like posts"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can unlike their own likes"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------- post_comments ----------

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "comments are viewable by authenticated users"
  on public.post_comments for select
  to authenticated
  using (true);

create policy "users can comment as themselves"
  on public.post_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "users can delete their own comments"
  on public.post_comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- ---------- follows ----------

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy "follows are viewable by authenticated users"
  on public.follows for select
  to authenticated
  using (true);

create policy "users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

-- ---------- conversations / messages ----------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- helper: is the current user a member of this conversation?
-- (security definer avoids recursive-RLS pitfalls on conversation_members)
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "members can view their conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_member(id));

create policy "authenticated users can start a conversation"
  on public.conversations for insert
  to authenticated
  with check (true);

create policy "members can view conversation membership"
  on public.conversation_members for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "users can add themselves or be added by a member"
  on public.conversation_members for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_conversation_member(conversation_id));

create policy "members can view messages"
  on public.messages for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "members can send messages"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

-- enable realtime for live message delivery
alter publication supabase_realtime add table public.messages;
