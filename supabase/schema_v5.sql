-- VYRO database schema — part 5 (real short video posts)
-- Run this AFTER schema.sql, schema_v2.sql, schema_v3.sql and schema_v4.sql, once, in Supabase → SQL Editor → New query → paste → Run.

-- ---------- video + visibility columns on posts ----------

alter table public.posts add column if not exists video_url text;
alter table public.posts add column if not exists cover_url text;
alter table public.posts add column if not exists video_duration_seconds numeric;
alter table public.posts add column if not exists comments_enabled boolean not null default true;
alter table public.posts add column if not exists visibility text not null default 'everyone'
  check (visibility in ('everyone', 'followers', 'only_me'));

-- ---------- visibility-aware read policy ----------

create or replace function public.can_view_post(p_author_id uuid, p_visibility text)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  if auth.uid() = p_author_id then
    return true;
  end if;
  if p_visibility = 'everyone' then
    return true;
  elsif p_visibility = 'followers' then
    return exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p_author_id
    );
  else
    return false;
  end if;
end;
$$;

drop policy if exists "posts are viewable by authenticated users" on public.posts;
create policy "posts are viewable respecting visibility"
  on public.posts for select
  to authenticated
  using (public.can_view_post(author_id, visibility));

-- ---------- comments respect the comments_enabled toggle ----------

drop policy if exists "users can comment as themselves" on public.post_comments;
create policy "users can comment as themselves"
  on public.post_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.comments_enabled = true and public.can_view_post(p.author_id, p.visibility)
    )
  );
