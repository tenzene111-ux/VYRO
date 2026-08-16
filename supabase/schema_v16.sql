-- VYRO database schema — part 16 (comment replies + comment likes)
-- Run this AFTER schema_v15.sql, once, in Supabase → SQL Editor → New query → paste → Run.

alter table public.post_comments add column if not exists parent_id uuid references public.post_comments (id) on delete cascade;

create table if not exists public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

create policy "comment likes are viewable by everyone"
  on public.comment_likes for select
  to authenticated
  using (true);

create policy "users can like comments as themselves"
  on public.comment_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can unlike their own comment likes"
  on public.comment_likes for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.notify_on_comment_reply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  parent_author uuid;
begin
  if new.parent_id is null then
    return new;
  end if;
  select author_id into parent_author from public.post_comments where id = new.parent_id;
  if parent_author is not null and parent_author <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
      values (parent_author, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_comment_reply on public.post_comments;
create trigger on_comment_reply
  after insert on public.post_comments
  for each row execute procedure public.notify_on_comment_reply();
