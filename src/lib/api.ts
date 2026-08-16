import { supabase } from "./supabase";
import { sendPushNotification } from "./push";
import type { Profile } from "../context/AuthContext";
import type { Database } from "./database.types";

async function notifyPostAction(postId: string, actorId: string, kind: "like" | "comment") {
  const [{ data: post }, { data: actor }] = await Promise.all([
    supabase.from("posts").select("author_id").eq("id", postId).single(),
    supabase.from("profiles").select("name").eq("id", actorId).single(),
  ]);
  if (!post || !actor || post.author_id === actorId) return;
  const title = kind === "like" ? `${actor.name} liked your post` : `${actor.name} commented on your post`;
  await sendPushNotification(post.author_id, title, "", "/home");
}

async function notifyConversationMembers(conversationId: string, senderId: string, preview: string) {
  const [{ data: conv }, { data: members }, { data: sender }] = await Promise.all([
    supabase.from("conversations").select("is_group").eq("id", conversationId).single(),
    supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId),
    supabase.from("profiles").select("name").eq("id", senderId).single(),
  ]);
  if (!conv || conv.is_group || !sender) return;
  const otherId = (members ?? []).find((m) => m.user_id !== senderId)?.user_id;
  if (!otherId) return;
  await sendPushNotification(otherId, sender.name, preview, `/chat/${conversationId}`);
}

async function notifyFollowersLive(hostId: string, liveId: string, title: string) {
  const [{ data: followers }, { data: host }] = await Promise.all([
    supabase.from("follows").select("follower_id").eq("following_id", hostId),
    supabase.from("profiles").select("name").eq("id", hostId).single(),
  ]);
  if (!host) return;
  await Promise.allSettled(
    (followers ?? []).map((f) => sendPushNotification(f.follower_id, `${host.name} is live now`, title, `/live/${liveId}`))
  );
}

export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export type FeedPost = {
  id: string;
  text: string;
  image_url: string | null;
  video_url: string | null;
  cover_url: string | null;
  video_duration_seconds: number | null;
  comments_enabled: boolean;
  visibility: string;
  remix_type: "duet" | "stitch" | null;
  remix_of_post_id: string | null;
  created_at: string;
  edited_at: string | null;
  author: Profile;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  my_reaction: ReactionType | null;
  saved_by_me: boolean;
};

export type PostBrief = {
  id: string;
  video_url: string;
  cover_url: string | null;
  video_duration_seconds: number | null;
  author: Profile;
};

export async function getPostBrief(postId: string): Promise<PostBrief | null> {
  const { data } = await supabase
    .from("posts")
    .select("id, video_url, cover_url, video_duration_seconds, author_id")
    .eq("id", postId)
    .single();
  if (!data || !data.video_url) return null;
  const author = await getProfile(data.author_id);
  if (!author) return null;
  return { id: data.id, video_url: data.video_url, cover_url: data.cover_url, video_duration_seconds: data.video_duration_seconds, author };
}

export async function listProfiles(excludeId?: string): Promise<Profile[]> {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return data ?? null;
}

export async function updateProfile(
  id: string,
  patch: { name?: string; bio?: string; location?: string; avatar_url?: string }
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function createPost(authorId: string, text: string, imageUrl?: string) {
  const { error } = await supabase.from("posts").insert({ author_id: authorId, text, image_url: imageUrl ?? null });
  if (error) throw error;
}

export async function updatePost(postId: string, text: string) {
  const { error } = await supabase.from("posts").update({ text, edited_at: new Date().toISOString() }).eq("id", postId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function createVideoPost(
  authorId: string,
  params: {
    caption: string;
    videoUrl: string;
    coverUrl: string | null;
    durationSeconds: number;
    visibility: "everyone" | "followers" | "only_me";
    commentsEnabled: boolean;
    remixType?: "duet" | "stitch" | null;
    remixOfPostId?: string | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      text: params.caption,
      video_url: params.videoUrl,
      cover_url: params.coverUrl,
      video_duration_seconds: params.durationSeconds,
      visibility: params.visibility,
      comments_enabled: params.commentsEnabled,
      remix_type: params.remixType ?? null,
      remix_of_post_id: params.remixOfPostId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function hydrateFeedPosts(
  posts: {
    id: string;
    text: string;
    image_url: string | null;
    video_url: string | null;
    cover_url: string | null;
    video_duration_seconds: number | null;
    comments_enabled: boolean;
    visibility: string;
    remix_type: string | null;
    remix_of_post_id: string | null;
    created_at: string;
    edited_at: string | null;
    author_id: string;
  }[],
  authors: Profile[],
  likes: { post_id: string; user_id: string; reaction: string }[],
  comments: { post_id: string }[],
  currentUserId: string,
  savedPostIds: Set<string> = new Set()
): FeedPost[] {
  const authorById = new Map(authors.map((a) => [a.id, a]));
  const likesByPost = new Map<string, { count: number; myReaction: ReactionType | null }>();
  for (const l of likes) {
    const cur = likesByPost.get(l.post_id) ?? { count: 0, myReaction: null };
    cur.count += 1;
    if (l.user_id === currentUserId) cur.myReaction = l.reaction as ReactionType;
    likesByPost.set(l.post_id, cur);
  }
  const commentsByPost = new Map<string, number>();
  for (const c of comments) {
    commentsByPost.set(c.post_id, (commentsByPost.get(c.post_id) ?? 0) + 1);
  }

  return posts
    .map((p) => {
      const author = authorById.get(p.author_id);
      if (!author) return null;
      const likeInfo = likesByPost.get(p.id) ?? { count: 0, myReaction: null };
      return {
        id: p.id,
        text: p.text,
        image_url: p.image_url,
        video_url: p.video_url,
        cover_url: p.cover_url,
        video_duration_seconds: p.video_duration_seconds,
        comments_enabled: p.comments_enabled,
        visibility: p.visibility,
        remix_type: p.remix_type as "duet" | "stitch" | null,
        remix_of_post_id: p.remix_of_post_id,
        created_at: p.created_at,
        edited_at: p.edited_at,
        author,
        like_count: likeInfo.count,
        comment_count: commentsByPost.get(p.id) ?? 0,
        liked_by_me: likeInfo.myReaction !== null,
        my_reaction: likeInfo.myReaction,
        saved_by_me: savedPostIds.has(p.id),
      };
    })
    .filter((p): p is FeedPost => p !== null);
}

export async function listFeedPosts(currentUserId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, remix_type, remix_of_post_id, created_at, edited_at, author_id")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id, reaction").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
    listSavedPostIds(currentUserId),
  ]);

  return hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], currentUserId, savedPostIds);
}

export async function listFollowingFeed(currentUserId: string, authorIds: string[]): Promise<FeedPost[]> {
  if (authorIds.length === 0) return [];
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, remix_type, remix_of_post_id, created_at, edited_at, author_id")
    .in("author_id", [...new Set(authorIds)])
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const authorIdsFound = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIdsFound),
    supabase.from("post_likes").select("post_id, user_id, reaction").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
    listSavedPostIds(currentUserId),
  ]);

  return hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], currentUserId, savedPostIds);
}

export async function listTopPosts(currentUserId: string, limit = 5): Promise<FeedPost[]> {
  const all = await listFeedPosts(currentUserId);
  return [...all].sort((a, b) => b.like_count - a.like_count).slice(0, limit);
}

export async function listVideoPosts(currentUserId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, remix_type, remix_of_post_id, created_at, edited_at, author_id")
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id, reaction").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
    listSavedPostIds(currentUserId),
  ]);

  return hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], currentUserId, savedPostIds);
}

export async function searchPeopleAndPosts(
  currentUserId: string,
  query: string
): Promise<{ people: Profile[]; posts: FeedPost[] }> {
  const q = query.trim();
  if (!q) return { people: [], posts: [] };

  const [{ data: people }, { data: posts }] = await Promise.all([
    supabase.from("profiles").select("*").or(`name.ilike.%${q}%,username.ilike.%${q}%`).neq("id", currentUserId).limit(20),
    supabase
      .from("posts")
      .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, remix_type, remix_of_post_id, created_at, edited_at, author_id")
      .ilike("text", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!posts || posts.length === 0) {
    return { people: people ?? [], posts: [] };
  }

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);
  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id, reaction").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
    listSavedPostIds(currentUserId),
  ]);

  return {
    people: people ?? [],
    posts: hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], currentUserId, savedPostIds),
  };
}

export type Comment = {
  id: string;
  post_id: string;
  text: string;
  parent_id: string | null;
  created_at: string;
  author: Profile;
  like_count: number;
  liked_by_me: boolean;
  my_reaction: ReactionType | null;
  replies: Comment[];
};

export async function listComments(postId: string, currentUserId?: string): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id, post_id, text, parent_id, created_at, author_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  const commentIds = comments.map((c) => c.id);
  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const [{ data: authors }, { data: likes }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("comment_likes").select("comment_id, user_id, reaction").in("comment_id", commentIds),
  ]);
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));
  const likesByComment = new Map<string, { count: number; myReaction: ReactionType | null }>();
  for (const l of likes ?? []) {
    const cur = likesByComment.get(l.comment_id) ?? { count: 0, myReaction: null };
    cur.count += 1;
    if (l.user_id === currentUserId) cur.myReaction = l.reaction as ReactionType;
    likesByComment.set(l.comment_id, cur);
  }

  const byId = new Map<string, Comment>();
  for (const c of comments) {
    const author = authorById.get(c.author_id);
    if (!author) continue;
    const likeInfo = likesByComment.get(c.id) ?? { count: 0, myReaction: null };
    byId.set(c.id, {
      id: c.id,
      post_id: c.post_id,
      text: c.text,
      parent_id: c.parent_id,
      created_at: c.created_at,
      author,
      like_count: likeInfo.count,
      liked_by_me: likeInfo.myReaction !== null,
      my_reaction: likeInfo.myReaction,
      replies: [],
    });
  }

  const topLevel: Comment[] = [];
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id)!.replies.push(c);
    else topLevel.push(c);
  }
  return topLevel;
}

export async function addComment(postId: string, authorId: string, text: string, parentId?: string) {
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: authorId, text, parent_id: parentId ?? null });
  if (error) throw error;
  notifyPostAction(postId, authorId, "comment").catch(() => {});
}

export async function toggleCommentLike(commentId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
    if (error) throw error;
  }
}

export async function setCommentReaction(commentId: string, userId: string, reaction: ReactionType | null) {
  if (reaction === null) {
    const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("comment_likes").upsert({ comment_id: commentId, user_id: userId, reaction }, { onConflict: "comment_id,user_id" });
  if (error) throw error;
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    notifyPostAction(postId, userId, "like").catch(() => {});
  }
}

export async function setPostReaction(postId: string, userId: string, reaction: ReactionType | null) {
  if (reaction === null) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("post_likes").upsert({ post_id: postId, user_id: userId, reaction }, { onConflict: "post_id,user_id" });
  if (error) throw error;
  notifyPostAction(postId, userId, "like").catch(() => {});
}

export async function listSavedPostIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("saved_posts").select("post_id").eq("user_id", userId);
  return new Set((data ?? []).map((s) => s.post_id));
}

export async function toggleSavePost(userId: string, postId: string, currentlySaved: boolean) {
  if (currentlySaved) {
    const { error } = await supabase.from("saved_posts").delete().eq("user_id", userId).eq("post_id", postId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("saved_posts").insert({ user_id: userId, post_id: postId });
    if (error) throw error;
  }
}

export async function listSavedPosts(userId: string): Promise<FeedPost[]> {
  const { data: saved, error } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!saved || saved.length === 0) return [];

  const postIds = saved.map((s) => s.post_id);
  const { data: posts } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, remix_type, remix_of_post_id, created_at, edited_at, author_id")
    .in("id", postIds);
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const [{ data: authors }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id, reaction").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
  ]);

  const hydrated = hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], userId, new Set(postIds));
  const orderIndex = new Map(postIds.map((id, i) => [id, i]));
  return hydrated.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
}

export async function listLikedPosts(userId: string): Promise<FeedPost[]> {
  const { data: liked, error } = await supabase
    .from("post_likes")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!liked || liked.length === 0) return [];

  const postIds = liked.map((l) => l.post_id);
  const { data: posts } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, remix_type, remix_of_post_id, created_at, edited_at, author_id")
    .in("id", postIds);
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id, reaction").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
    listSavedPostIds(userId),
  ]);

  const hydrated = hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], userId, savedPostIds);
  const orderIndex = new Map(postIds.map((id, i) => [id, i]));
  return hydrated.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
}

export async function listFollowing(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  return new Set((data ?? []).map((f) => f.following_id));
}

export async function toggleFollow(followerId: string, followingId: string, currentlyFollowing: boolean) {
  if (currentlyFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    notifyFollow(followerId, followingId).catch(() => {});
  }
}

async function notifyFollow(followerId: string, followingId: string) {
  const { data: actor } = await supabase.from("profiles").select("name").eq("id", followerId).single();
  if (actor) await sendPushNotification(followingId, `${actor.name} started following you`, "", `/profile/${followerId}`);
}

export async function countFollowers(userId: string): Promise<number> {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

export async function countFollowing(userId: string): Promise<number> {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count ?? 0;
}

export async function countPosts(userId: string): Promise<number> {
  const { count } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", userId);
  return count ?? 0;
}

export type SimplePost = {
  id: string;
  text: string;
  image_url: string | null;
  video_url: string | null;
  cover_url: string | null;
  created_at: string;
};

export async function listPostsByAuthor(authorId: string): Promise<SimplePost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, created_at")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

// ---------- chat ----------

export async function getConversationOther(conversationId: string, userId: string): Promise<Profile | null> {
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const otherId = (members ?? []).find((m) => m.user_id !== userId)?.user_id;
  if (otherId) return getProfile(otherId);
  // No other member — this is either a not-yet-loaded conversation, or a
  // Saved Messages (is_self) conversation whose only member is the viewer.
  const { data: conv } = await supabase.from("conversations").select("is_self").eq("id", conversationId).maybeSingle();
  if (conv?.is_self) return getProfile(userId);
  return null;
}

export type ChatConversation = {
  id: string;
  other: Profile;
  last_message: string | null;
  last_message_at: string | null;
  is_self: boolean;
  archived: boolean;
  unread: boolean;
};

export async function listConversations(userId: string): Promise<ChatConversation[]> {
  const { data: memberships, error } = await supabase
    .from("conversation_members")
    .select("conversation_id, archived, last_read_at")
    .eq("user_id", userId);
  if (error) throw error;
  const allMembershipIds = (memberships ?? []).map((m) => m.conversation_id);
  if (allMembershipIds.length === 0) return [];
  const archivedByConversation = new Map((memberships ?? []).map((m) => [m.conversation_id, m.archived]));
  const lastReadByConversation = new Map((memberships ?? []).map((m) => [m.conversation_id, m.last_read_at]));

  const { data: conversations } = await supabase.from("conversations").select("id, is_self, is_group").in("id", allMembershipIds);
  const isSelfByConversation = new Map((conversations ?? []).map((c) => [c.id, c.is_self]));
  // Group conversations have their own listing (GroupsTab, via
  // listMyGroups) and don't fit this "single other person" model — exclude
  // them here so a group never leaks into the 1:1 chat list showing one
  // arbitrary member's name, with a tap opening the wrong (1:1) screen.
  const conversationIds = (conversations ?? []).filter((c) => !c.is_group).map((c) => c.id);
  if (conversationIds.length === 0) return [];

  const { data: allMembers } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds);

  const otherIdByConversation = new Map<string, string>();
  for (const m of allMembers ?? []) {
    if (m.user_id !== userId) otherIdByConversation.set(m.conversation_id, m.user_id);
  }
  const otherIds = [...new Set(otherIdByConversation.values())];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", [...otherIds, userId]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: lastMessages } = await supabase
    .from("messages")
    .select(
      "conversation_id, sender_id, text, audio_url, ciphertext, image_url, video_url, file_name, poll_id, location_lat, shared_profile_id, sticker_emoji, deleted_at, created_at"
    )
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastByConversation = new Map<string, NonNullable<typeof lastMessages>[number]>();
  for (const m of lastMessages ?? []) {
    if (!lastByConversation.has(m.conversation_id)) lastByConversation.set(m.conversation_id, m);
  }

  return conversationIds
    .map((id) => {
      const isSelf = isSelfByConversation.get(id) ?? false;
      const otherId = isSelf ? userId : otherIdByConversation.get(id);
      const other = otherId ? profileById.get(otherId) : undefined;
      if (!other) return null;
      const last = lastByConversation.get(id);
      const lastReadAt = lastReadByConversation.get(id);
      const unread = !!last && last.sender_id !== userId && (!lastReadAt || new Date(last.created_at) > new Date(lastReadAt));
      return {
        id,
        other,
        last_message: last ? messagePreviewText(last) : null,
        last_message_at: last?.created_at ?? null,
        is_self: isSelf,
        archived: archivedByConversation.get(id) ?? false,
        unread,
      };
    })
    .filter((c): c is ChatConversation => c !== null)
    .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
}

export type MessageSearchHit = {
  conversationId: string;
  isGroup: boolean;
  groupId: string | null;
  title: string;
  avatarUrl: string | null;
  snippet: string;
  messageId: string;
  createdAt: string;
};

// Only plaintext text is searchable — encrypted messages (ciphertext) can't
// be searched server-side without decrypting every one client-side, which
// isn't practical for a search query. This is a disclosed limitation, same
// trade-off as the rest of the app's E2E encryption.
export async function searchMyMessages(userId: string, query: string, limit = 30): Promise<MessageSearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const { data: memberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId);
  const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
  if (conversationIds.length === 0) return [];

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, conversation_id, text, created_at")
    .in("conversation_id", conversationIds)
    .is("deleted_at", null)
    .ilike("text", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  const hitConvIds = [...new Set(messages.map((m) => m.conversation_id))];
  const { data: conversations } = await supabase.from("conversations").select("id, is_group, is_self").in("id", hitConvIds);
  const convMetaById = new Map((conversations ?? []).map((c) => [c.id, c]));

  const groupConvIds = hitConvIds.filter((id) => convMetaById.get(id)?.is_group);
  const { data: groups } =
    groupConvIds.length > 0
      ? await supabase.from("groups").select("id, conversation_id, name").in("conversation_id", groupConvIds)
      : { data: [] };
  const groupByConv = new Map((groups ?? []).map((g) => [g.conversation_id, g]));

  const otherConvIds = hitConvIds.filter((id) => !convMetaById.get(id)?.is_group);
  const otherByConv = new Map<string, Profile | null>();
  await Promise.all(
    otherConvIds.map(async (id) => {
      otherByConv.set(id, await getConversationOther(id, userId));
    })
  );

  return messages.map((m) => {
    const meta = convMetaById.get(m.conversation_id);
    const isGroup = !!meta?.is_group;
    const other = otherByConv.get(m.conversation_id);
    const group = groupByConv.get(m.conversation_id);
    const title = isGroup ? group?.name ?? "Group" : meta?.is_self ? "Saved Messages" : other?.name ?? "Chat";
    return {
      conversationId: m.conversation_id,
      isGroup,
      groupId: isGroup ? group?.id ?? null : null,
      title,
      avatarUrl: !isGroup && !meta?.is_self ? other?.avatar_url ?? null : null,
      snippet: m.text ?? "",
      messageId: m.id,
      createdAt: m.created_at,
    };
  });
}

export async function searchGroups(userId: string, query: string, limit = 20): Promise<(Group & { isMember: boolean })[]> {
  const q = query.trim();
  if (!q) return [];
  const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  const myGroupIds = new Set((memberships ?? []).map((m) => m.group_id));

  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(limit * 2);
  if (error) throw error;
  const visible = (data ?? []).filter((g) => g.privacy === "public" || myGroupIds.has(g.id)).slice(0, limit);
  const withCounts = await attachMemberCounts(visible);
  return withCounts.map((g) => ({ ...g, isMember: myGroupIds.has(g.id) }));
}

export async function getOrCreateSavedMessages(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("conversation_members")
    .select("conversation_id, conversations!inner(is_self)")
    .eq("user_id", userId)
    .eq("conversations.is_self", true)
    .limit(1);
  if (existing && existing.length > 0) return existing[0].conversation_id;

  const conversationId = crypto.randomUUID();
  const { error: convError } = await supabase.from("conversations").insert({ id: conversationId, is_group: false, is_self: true });
  if (convError) throw convError;
  const { error: memberError } = await supabase.from("conversation_members").insert({ conversation_id: conversationId, user_id: userId });
  if (memberError) throw memberError;
  return conversationId;
}

export async function setConversationArchived(userId: string, conversationId: string, archived: boolean) {
  const { error } = await supabase
    .from("conversation_members")
    .update({ archived })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export type ChatFolder = { id: string; name: string; icon: string; position: number; conversationIds: string[] };

export async function listChatFolders(userId: string): Promise<ChatFolder[]> {
  const { data: folders, error } = await supabase
    .from("chat_folders")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  if (!folders || folders.length === 0) return [];

  const folderIds = folders.map((f) => f.id);
  const { data: links } = await supabase.from("chat_folder_conversations").select("folder_id, conversation_id").in("folder_id", folderIds);
  const conversationIdsByFolder = new Map<string, string[]>();
  for (const l of links ?? []) {
    const cur = conversationIdsByFolder.get(l.folder_id) ?? [];
    cur.push(l.conversation_id);
    conversationIdsByFolder.set(l.folder_id, cur);
  }

  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    icon: f.icon,
    position: f.position,
    conversationIds: conversationIdsByFolder.get(f.id) ?? [],
  }));
}

export async function createChatFolder(userId: string, name: string, icon: string, conversationIds: string[]): Promise<string> {
  const folderId = crypto.randomUUID();
  const { error } = await supabase.from("chat_folders").insert({ id: folderId, user_id: userId, name, icon });
  if (error) throw error;
  if (conversationIds.length > 0) {
    const { error: linkError } = await supabase
      .from("chat_folder_conversations")
      .insert(conversationIds.map((conversation_id) => ({ folder_id: folderId, conversation_id })));
    if (linkError) throw linkError;
  }
  return folderId;
}

export async function updateChatFolder(folderId: string, name: string, icon: string, conversationIds: string[]) {
  const { error } = await supabase.from("chat_folders").update({ name, icon }).eq("id", folderId);
  if (error) throw error;
  const { error: delError } = await supabase.from("chat_folder_conversations").delete().eq("folder_id", folderId);
  if (delError) throw delError;
  if (conversationIds.length > 0) {
    const { error: insError } = await supabase
      .from("chat_folder_conversations")
      .insert(conversationIds.map((conversation_id) => ({ folder_id: folderId, conversation_id })));
    if (insError) throw insError;
  }
}

export async function deleteChatFolder(folderId: string) {
  const { error } = await supabase.from("chat_folders").delete().eq("id", folderId);
  if (error) throw error;
}

export async function getOrCreateConversationWith(userId: string, otherUserId: string): Promise<string> {
  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  const myConvIds = (myMemberships ?? []).map((m) => m.conversation_id);

  if (myConvIds.length > 0) {
    const { data: shared } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConvIds);
    if (shared && shared.length > 0) return shared[0].conversation_id;
  }

  // Generate the id client-side instead of reading it back from the insert:
  // the "view your conversations" RLS policy requires already being a member,
  // which isn't true yet at this exact instant, so a chained .select() on the
  // insert would come back empty and fail before membership rows even exist.
  const conversationId = crypto.randomUUID();
  const { error: convError } = await supabase.from("conversations").insert({ id: conversationId, is_group: false });
  if (convError) throw convError;

  const { error: selfMemberError } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: userId });
  if (selfMemberError) throw selfMemberError;

  // Inserted as a separate statement after the row above: the "add another
  // member to a conversation you're already in" RLS check needs the self
  // membership to already be committed, which a single batched insert can't
  // see (both rows are evaluated against the same pre-insert snapshot).
  const { error: otherMemberError } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: otherUserId });
  if (otherMemberError) throw otherMemberError;

  return conversationId;
}

export type MessageReaction = { user_id: string; emoji: string };

export type PollOption = { id: string; text: string; position: number };
export type PollVote = { option_id: string; user_id: string };
export type Poll = {
  id: string;
  question: string;
  allow_multiple: boolean;
  closed: boolean;
  creator_id: string;
  options: PollOption[];
  votes: PollVote[];
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  ciphertext: string | null;
  iv: string | null;
  sender_public_key_jwk: Database["public"]["Tables"]["messages"]["Row"]["sender_public_key_jwk"];
  recipient_public_key_jwk: Database["public"]["Tables"]["messages"]["Row"]["recipient_public_key_jwk"];
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  pinned: boolean;
  forwarded: boolean;
  image_url: string | null;
  video_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  poll_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  shared_profile_id: string | null;
  story_id: string | null;
  story_preview_image_url: string | null;
  story_preview_text: string | null;
  topic_id: string | null;
  sticker_emoji: string | null;
  created_at: string;
  reactions: MessageReaction[];
  poll: Poll | null;
  sharedProfile: Profile | null;
};

export function messagePreviewText(
  m: Pick<
    ChatMessage,
    "text" | "audio_url" | "image_url" | "video_url" | "file_name" | "ciphertext" | "deleted_at" | "location_lat" | "shared_profile_id" | "sticker_emoji"
  > & {
    poll?: Pick<Poll, "question"> | null;
    poll_id?: string | null;
    sharedProfile?: Pick<Profile, "name"> | null;
  }
): string {
  if (m.deleted_at) return "This message was deleted";
  if (m.text) return m.text;
  if (m.sticker_emoji) return `${m.sticker_emoji} Sticker`;
  if (m.poll) return `📊 ${m.poll.question}`;
  if (m.poll_id) return "📊 Poll";
  if (m.location_lat) return "📍 Location";
  if (m.sharedProfile) return `👤 ${m.sharedProfile.name}`;
  if (m.shared_profile_id) return "👤 Contact";
  if (m.image_url) return "📷 Photo";
  if (m.video_url) return "🎬 Video";
  if (m.file_name) return `📄 ${m.file_name}`;
  if (m.audio_url) return "🎤 Voice message";
  if (m.ciphertext) return "🔒 Encrypted message";
  return "";
}

export async function listMessages(conversationId: string, topicId?: string | null): Promise<ChatMessage[]> {
  let query = supabase.from("messages").select("*").eq("conversation_id", conversationId);
  // topicId omitted (undefined) = no filter, for conversations that don't
  // use topics at all; null = the untitled "General" topic; a string = a
  // specific named topic.
  if (topicId !== undefined) query = topicId === null ? query.is("topic_id", null) : query.eq("topic_id", topicId);
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const { data: reactions } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .eq("conversation_id", conversationId);
  const reactionsByMessage = new Map<string, MessageReaction[]>();
  for (const r of reactions ?? []) {
    const cur = reactionsByMessage.get(r.message_id) ?? [];
    cur.push({ user_id: r.user_id, emoji: r.emoji });
    reactionsByMessage.set(r.message_id, cur);
  }

  const pollIds = [...new Set(data.map((m) => m.poll_id).filter((id): id is string => !!id))];
  const pollsById = new Map<string, Poll>();
  if (pollIds.length > 0) {
    const { data: polls } = await supabase.from("polls").select("*").in("id", pollIds);
    const { data: options } = await supabase.from("poll_options").select("*").in("poll_id", pollIds).order("position", { ascending: true });
    const { data: votes } = await supabase.from("poll_votes").select("poll_id, option_id, user_id").in("poll_id", pollIds);

    const optionsByPoll = new Map<string, PollOption[]>();
    for (const o of options ?? []) {
      const cur = optionsByPoll.get(o.poll_id) ?? [];
      cur.push({ id: o.id, text: o.text, position: o.position });
      optionsByPoll.set(o.poll_id, cur);
    }
    const votesByPoll = new Map<string, PollVote[]>();
    for (const v of votes ?? []) {
      const cur = votesByPoll.get(v.poll_id) ?? [];
      cur.push({ option_id: v.option_id, user_id: v.user_id });
      votesByPoll.set(v.poll_id, cur);
    }
    for (const p of polls ?? []) {
      pollsById.set(p.id, {
        id: p.id,
        question: p.question,
        allow_multiple: p.allow_multiple,
        closed: p.closed,
        creator_id: p.creator_id,
        options: optionsByPoll.get(p.id) ?? [],
        votes: votesByPoll.get(p.id) ?? [],
      });
    }
  }

  const sharedProfileIds = [...new Set(data.map((m) => m.shared_profile_id).filter((id): id is string => !!id))];
  const sharedProfileById = new Map<string, Profile>();
  if (sharedProfileIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", sharedProfileIds);
    for (const p of profiles ?? []) sharedProfileById.set(p.id, p);
  }

  return data.map((m) => ({
    ...m,
    reactions: reactionsByMessage.get(m.id) ?? [],
    poll: m.poll_id ? pollsById.get(m.poll_id) ?? null : null,
    sharedProfile: m.shared_profile_id ? sharedProfileById.get(m.shared_profile_id) ?? null : null,
  }));
}

export async function sendLocationMessage(
  conversationId: string,
  senderId: string,
  lat: number,
  lng: number,
  label?: string,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    location_lat: lat,
    location_lng: lng,
    location_label: label ?? null,
    reply_to_id: replyToId ?? null,
    topic_id: topicId ?? null,
  });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, "📍 Location").catch(() => {});
}

export async function sendContactMessage(
  conversationId: string,
  senderId: string,
  contactId: string,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, shared_profile_id: contactId, reply_to_id: replyToId ?? null, topic_id: topicId ?? null });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, "👤 Contact").catch(() => {});
}

export async function sendStickerMessage(
  conversationId: string,
  senderId: string,
  emoji: string,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, sticker_emoji: emoji, reply_to_id: replyToId ?? null, topic_id: topicId ?? null });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, `${emoji} Sticker`).catch(() => {});
}

export async function sendPollMessage(
  conversationId: string,
  senderId: string,
  question: string,
  options: string[],
  allowMultiple: boolean,
  replyToId?: string,
  topicId?: string | null
) {
  const { data: pollId, error } = await supabase.rpc("create_poll", {
    p_conversation_id: conversationId,
    p_question: question,
    p_options: options,
    p_allow_multiple: allowMultiple,
  });
  if (error) throw error;
  const { error: msgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, poll_id: pollId, reply_to_id: replyToId ?? null, topic_id: topicId ?? null });
  if (msgError) throw msgError;
  notifyConversationMembers(conversationId, senderId, `📊 ${question}`).catch(() => {});
}

export async function votePoll(pollId: string, optionIds: string[]) {
  const { error } = await supabase.rpc("vote_poll", { p_poll_id: pollId, p_option_ids: optionIds });
  if (error) throw error;
}

export async function closePoll(pollId: string) {
  const { error } = await supabase.rpc("close_poll", { p_poll_id: pollId });
  if (error) throw error;
}

export function subscribeToPollVotes(conversationId: string, onChange: () => void) {
  const channel = supabase
    .channel(`poll-votes-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "poll_votes", filter: `conversation_id=eq.${conversationId}` },
      onChange
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function sendMessage(conversationId: string, senderId: string, text: string, replyToId?: string, topicId?: string | null) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, text, reply_to_id: replyToId ?? null, topic_id: topicId ?? null });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, text).catch(() => {});
}

export async function forwardMessage(conversationId: string, senderId: string, text: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, text, forwarded: true });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, text).catch(() => {});
}

export async function sendVoiceMessage(
  conversationId: string,
  senderId: string,
  audioUrl: string,
  durationSeconds: number,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    audio_url: audioUrl,
    audio_duration_seconds: durationSeconds,
    reply_to_id: replyToId ?? null,
    topic_id: topicId ?? null,
  });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, "🎤 Voice message").catch(() => {});
}

export async function publishPublicKey(userId: string, jwk: JsonWebKey) {
  const { error } = await supabase.from("profiles").update({ public_key_jwk: jwk as unknown as Database["public"]["Tables"]["profiles"]["Row"]["public_key_jwk"] }).eq("id", userId);
  if (error) throw error;
}

export async function sendEncryptedMessage(
  conversationId: string,
  senderId: string,
  ciphertext: string,
  iv: string,
  senderPublicJwk: JsonWebKey,
  recipientPublicJwk: JsonWebKey,
  replyToId?: string
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    ciphertext,
    iv,
    sender_public_key_jwk: senderPublicJwk as unknown as Database["public"]["Tables"]["profiles"]["Row"]["public_key_jwk"],
    recipient_public_key_jwk: recipientPublicJwk as unknown as Database["public"]["Tables"]["profiles"]["Row"]["public_key_jwk"],
    reply_to_id: replyToId ?? null,
  });
  if (error) throw error;
  // never leak plaintext through the push notification pipeline for an end-to-end encrypted message
  notifyConversationMembers(conversationId, senderId, "🔒 New message").catch(() => {});
}

export async function editMessage(messageId: string, text: string) {
  const { error } = await supabase.from("messages").update({ text, edited_at: new Date().toISOString() }).eq("id", messageId);
  if (error) throw error;
}

export async function editEncryptedMessage(messageId: string, ciphertext: string, iv: string) {
  const { error } = await supabase
    .from("messages")
    .update({ ciphertext, iv, edited_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
}

export async function deleteMessageForEveryone(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({
      text: null,
      audio_url: null,
      audio_duration_seconds: null,
      ciphertext: null,
      iv: null,
      image_url: null,
      video_url: null,
      file_url: null,
      file_name: null,
      file_size: null,
      poll_id: null,
      location_lat: null,
      location_lng: null,
      location_label: null,
      shared_profile_id: null,
      sticker_emoji: null,
      pinned: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", messageId);
  if (error) throw error;
}

export async function sendImageMessage(
  conversationId: string,
  senderId: string,
  imageUrl: string,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, image_url: imageUrl, reply_to_id: replyToId ?? null, topic_id: topicId ?? null });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, "📷 Photo").catch(() => {});
}

export async function sendVideoMessageFile(
  conversationId: string,
  senderId: string,
  videoUrl: string,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, video_url: videoUrl, reply_to_id: replyToId ?? null, topic_id: topicId ?? null });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, "🎬 Video").catch(() => {});
}

export async function sendFileMessage(
  conversationId: string,
  senderId: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    file_url: fileUrl,
    file_name: fileName,
    file_size: fileSize,
    reply_to_id: replyToId ?? null,
    topic_id: topicId ?? null,
  });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, `📄 ${fileName}`).catch(() => {});
}

export async function pinMessage(conversationId: string, messageId: string) {
  await supabase.from("messages").update({ pinned: false }).eq("conversation_id", conversationId).eq("pinned", true);
  const { error } = await supabase.from("messages").update({ pinned: true }).eq("id", messageId);
  if (error) throw error;
}

export async function unpinMessage(messageId: string) {
  const { error } = await supabase.from("messages").update({ pinned: false }).eq("id", messageId);
  if (error) throw error;
}

export async function toggleMessageReaction(
  messageId: string,
  conversationId: string,
  userId: string,
  emoji: string | null,
  currentEmoji: string | null
) {
  if (emoji === null || emoji === currentEmoji) {
    const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("message_reactions")
    .upsert({ message_id: messageId, conversation_id: conversationId, user_id: userId, emoji }, { onConflict: "message_id,user_id" });
  if (error) throw error;
}

export async function markConversationRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getOtherLastRead(conversationId: string, otherUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from("conversation_members")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", otherUserId)
    .maybeSingle();
  return data?.last_read_at ?? null;
}

export async function listReadPointers(conversationId: string): Promise<{ user_id: string; last_read_at: string }[]> {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("user_id, last_read_at")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  return data ?? [];
}

async function fetchPoll(pollId: string): Promise<Poll | null> {
  const { data: poll } = await supabase.from("polls").select("*").eq("id", pollId).maybeSingle();
  if (!poll) return null;
  const { data: options } = await supabase.from("poll_options").select("*").eq("poll_id", pollId).order("position", { ascending: true });
  const { data: votes } = await supabase.from("poll_votes").select("option_id, user_id").eq("poll_id", pollId);
  return {
    id: poll.id,
    question: poll.question,
    allow_multiple: poll.allow_multiple,
    closed: poll.closed,
    creator_id: poll.creator_id,
    options: (options ?? []).map((o) => ({ id: o.id, text: o.text, position: o.position })),
    votes: (votes ?? []).map((v) => ({ option_id: v.option_id, user_id: v.user_id })),
  };
}

export function subscribeToMessages(conversationId: string, onInsert: (message: ChatMessage) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const row = payload.new as Omit<ChatMessage, "reactions" | "poll" | "sharedProfile">;
        const pollPromise = row.poll_id ? fetchPoll(row.poll_id) : Promise.resolve(null);
        const profilePromise = row.shared_profile_id ? getProfile(row.shared_profile_id) : Promise.resolve(null);
        Promise.all([pollPromise, profilePromise]).then(([poll, sharedProfile]) =>
          onInsert({ ...row, reactions: [], poll, sharedProfile })
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMessageUpdates(conversationId: string, onUpdate: (message: ChatMessage) => void) {
  const channel = supabase
    .channel(`message-updates:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate(payload.new as ChatMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToReactions(conversationId: string, onChange: () => void) {
  const channel = supabase
    .channel(`reactions:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "message_reactions", filter: `conversation_id=eq.${conversationId}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToReadReceipts(conversationId: string, onChange: () => void) {
  const channel = supabase
    .channel(`read-receipts:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Broadcast needs one subscribed channel shared between sending and
// listening — a fresh unsubscribed channel per send() won't deliver.
export function createTypingChannel(conversationId: string, onTyping: (userId: string) => void) {
  const channel = supabase
    .channel(`typing:${conversationId}`)
    .on("broadcast", { event: "typing" }, ({ payload }) => onTyping((payload as { userId: string }).userId))
    .subscribe();

  return {
    sendTyping: (userId: string) => {
      channel.send({ type: "broadcast", event: "typing", payload: { userId } });
    },
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ---------- notifications ----------

export type NotificationRow = {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  actor: Profile | null;
  post_id: string | null;
};

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, read, created_at, actor_id, post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const actorIds = [...new Set(data.map((n) => n.actor_id).filter((id): id is string => !!id))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("*").in("id", actorIds)
    : { data: [] as Profile[] };
  const actorById = new Map((actors ?? []).map((a) => [a.id, a]));

  return data.map((n) => ({
    id: n.id,
    type: n.type,
    read: n.read,
    created_at: n.created_at,
    post_id: n.post_id,
    actor: n.actor_id ? actorById.get(n.actor_id) ?? null : null,
  }));
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
}

export async function deleteNotification(notificationId: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
  if (error) throw error;
}

export function subscribeToNotifications(userId: string, onInsert: () => void) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      onInsert
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------- groups ----------

export type Group = {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  creator_id: string;
  conversation_id: string | null;
  encrypted: boolean;
  created_at: string;
  member_count: number;
};

async function attachMemberCounts(groups: Database["public"]["Tables"]["groups"]["Row"][]): Promise<Group[]> {
  if (groups.length === 0) return [];
  const { data: members } = await supabase
    .from("group_members")
    .select("group_id")
    .in(
      "group_id",
      groups.map((g) => g.id)
    );
  const counts = new Map<string, number>();
  for (const m of members ?? []) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
  return groups.map((g) => ({ ...g, member_count: counts.get(g.id) ?? 0 }));
}

export async function listMyGroups(userId: string): Promise<Group[]> {
  const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) return [];
  const { data, error } = await supabase.from("groups").select("*").in("id", groupIds);
  if (error) throw error;
  return attachMemberCounts(data ?? []);
}

export async function listDiscoverGroups(userId: string): Promise<Group[]> {
  const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  const myGroupIds = (memberships ?? []).map((m) => m.group_id);
  let query = supabase.from("groups").select("*").eq("privacy", "public");
  if (myGroupIds.length > 0) query = query.not("id", "in", `(${myGroupIds.join(",")})`);
  const { data, error } = await query;
  if (error) throw error;
  return attachMemberCounts(data ?? []);
}

export async function createGroup(name: string, description: string, privacy: "public" | "private"): Promise<string> {
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_description: description || null,
    p_privacy: privacy,
  });
  if (error) throw error;
  return data as string;
}

export async function joinGroup(groupId: string) {
  const { error } = await supabase.rpc("join_group", { p_group_id: groupId });
  if (error) throw error;
}

export async function leaveGroup(groupId: string) {
  const { error } = await supabase.rpc("leave_group", { p_group_id: groupId });
  if (error) throw error;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data } = await supabase.from("groups").select("*").eq("id", groupId).single();
  if (!data) return null;
  const withCounts = await attachMemberCounts([data]);
  return withCounts[0] ?? null;
}

// ---------- group admin: roles, member management, bans ----------

export async function getMyGroupRole(groupId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export async function listGroupMembersDetailed(groupId: string): Promise<(Profile & { role: string })[]> {
  const { data: members, error } = await supabase.from("group_members").select("user_id, role").eq("group_id", groupId);
  if (error) throw error;
  const memberIds = (members ?? []).map((m) => m.user_id);
  if (memberIds.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", memberIds);
  const roleById = new Map((members ?? []).map((m) => [m.user_id, m.role]));
  return (profiles ?? []).map((p) => ({ ...p, role: roleById.get(p.id) ?? "member" }));
}

export async function listGroupBans(groupId: string): Promise<Profile[]> {
  const { data: bans, error } = await supabase.from("group_bans").select("user_id").eq("group_id", groupId);
  if (error) throw error;
  const userIds = (bans ?? []).map((b) => b.user_id);
  if (userIds.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
  return profiles ?? [];
}

export async function promoteGroupAdmin(groupId: string, userId: string) {
  const { error } = await supabase.rpc("promote_group_admin", { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function demoteGroupAdmin(groupId: string, userId: string) {
  const { error } = await supabase.rpc("demote_group_admin", { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { error } = await supabase.rpc("remove_group_member", { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function banGroupMember(groupId: string, userId: string) {
  const { error } = await supabase.rpc("ban_group_member", { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function unbanGroupMember(groupId: string, userId: string) {
  const { error } = await supabase.rpc("unban_group_member", { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

export async function updateGroupInfo(groupId: string, name: string, description: string) {
  const { error } = await supabase.rpc("update_group_info", { p_group_id: groupId, p_name: name, p_description: description || null });
  if (error) throw error;
}

export async function adminDeleteGroupMessage(messageId: string) {
  const { error } = await supabase.rpc("admin_delete_group_message", { p_message_id: messageId });
  if (error) throw error;
}

// ---------- group topics ----------
// Fully opt-in: a group with zero topics has no topic bar and every message
// carries topic_id = null, same as before this feature existed.

export type GroupTopic = { id: string; group_id: string; name: string; icon: string; created_by: string | null; position: number; created_at: string };

export async function listGroupTopics(groupId: string): Promise<GroupTopic[]> {
  const { data, error } = await supabase.from("group_topics").select("*").eq("group_id", groupId).order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createGroupTopic(groupId: string, userId: string, name: string, icon: string): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("group_topics").insert({ id, group_id: groupId, name, icon, created_by: userId });
  if (error) throw error;
  return id;
}

export async function deleteGroupTopic(topicId: string) {
  const { error } = await supabase.from("group_topics").delete().eq("id", topicId);
  if (error) throw error;
}

// ---------- channels ----------
// A broadcast feed, not a chat: owner/admins post, subscribers view and
// react/comment but can't post. No underlying conversation, unlike groups.

export type Channel = {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  owner_id: string;
  created_at: string;
  subscriber_count: number;
};

async function attachSubscriberCounts(channels: Database["public"]["Tables"]["channels"]["Row"][]): Promise<Channel[]> {
  if (channels.length === 0) return [];
  const { data: subs } = await supabase
    .from("channel_subscribers")
    .select("channel_id")
    .in(
      "channel_id",
      channels.map((c) => c.id)
    );
  const counts = new Map<string, number>();
  for (const s of subs ?? []) counts.set(s.channel_id, (counts.get(s.channel_id) ?? 0) + 1);
  return channels.map((c) => ({ ...c, subscriber_count: counts.get(c.id) ?? 0 }));
}

export async function listMyChannels(userId: string): Promise<Channel[]> {
  const { data: subs } = await supabase.from("channel_subscribers").select("channel_id").eq("user_id", userId);
  const channelIds = (subs ?? []).map((s) => s.channel_id);
  if (channelIds.length === 0) return [];
  const { data, error } = await supabase.from("channels").select("*").in("id", channelIds);
  if (error) throw error;
  return attachSubscriberCounts(data ?? []);
}

export async function listDiscoverChannels(userId: string): Promise<Channel[]> {
  const { data: subs } = await supabase.from("channel_subscribers").select("channel_id").eq("user_id", userId);
  const mySubIds = (subs ?? []).map((s) => s.channel_id);
  let query = supabase.from("channels").select("*").eq("privacy", "public");
  if (mySubIds.length > 0) query = query.not("id", "in", `(${mySubIds.join(",")})`);
  const { data, error } = await query;
  if (error) throw error;
  return attachSubscriberCounts(data ?? []);
}

export async function getChannel(channelId: string): Promise<Channel | null> {
  const { data, error } = await supabase.from("channels").select("*").eq("id", channelId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [channel] = await attachSubscriberCounts([data]);
  return channel;
}

export async function getMyChannelRole(channelId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("channel_subscribers")
    .select("role")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export async function listChannelSubscribers(channelId: string): Promise<(Profile & { role: string })[]> {
  const { data: subs, error } = await supabase.from("channel_subscribers").select("user_id, role").eq("channel_id", channelId);
  if (error) throw error;
  const userIds = (subs ?? []).map((s) => s.user_id);
  if (userIds.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
  const roleById = new Map((subs ?? []).map((s) => [s.user_id, s.role]));
  return (profiles ?? []).map((p) => ({ ...p, role: roleById.get(p.id) ?? "subscriber" }));
}

export async function createChannel(name: string, description: string, privacy: "public" | "private"): Promise<string> {
  const { data, error } = await supabase.rpc("create_channel", { p_name: name, p_description: description || null, p_privacy: privacy });
  if (error) throw error;
  return data as string;
}

export async function joinChannel(channelId: string) {
  const { error } = await supabase.rpc("join_channel", { p_channel_id: channelId });
  if (error) throw error;
}

export async function leaveChannel(channelId: string) {
  const { error } = await supabase.rpc("leave_channel", { p_channel_id: channelId });
  if (error) throw error;
}

export async function promoteChannelAdmin(channelId: string, userId: string) {
  const { error } = await supabase.rpc("promote_channel_admin", { p_channel_id: channelId, p_user_id: userId });
  if (error) throw error;
}

export async function demoteChannelAdmin(channelId: string, userId: string) {
  const { error } = await supabase.rpc("demote_channel_admin", { p_channel_id: channelId, p_user_id: userId });
  if (error) throw error;
}

export type ChannelPost = {
  id: string;
  channel_id: string;
  author_id: string;
  text: string | null;
  image_url: string | null;
  video_url: string | null;
  pinned: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

export async function listChannelPosts(channelId: string, viewerId: string): Promise<ChannelPost[]> {
  const { data, error } = await supabase
    .from("channel_posts")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const postIds = data.map((p) => p.id);
  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from("channel_post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("channel_post_comments").select("post_id").in("post_id", postIds),
  ]);
  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes ?? []) {
    likeCounts.set(l.post_id, (likeCounts.get(l.post_id) ?? 0) + 1);
    if (l.user_id === viewerId) likedByMe.add(l.post_id);
  }
  const commentCounts = new Map<string, number>();
  for (const c of comments ?? []) commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);

  return data.map((p) => ({
    ...p,
    like_count: likeCounts.get(p.id) ?? 0,
    liked_by_me: likedByMe.has(p.id),
    comment_count: commentCounts.get(p.id) ?? 0,
  }));
}

export async function createChannelPost(channelId: string, text: string, imageUrl?: string, videoUrl?: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_channel_post", {
    p_channel_id: channelId,
    p_text: text || null,
    p_image_url: imageUrl ?? null,
    p_video_url: videoUrl ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteChannelPost(postId: string) {
  const { error } = await supabase.rpc("delete_channel_post", { p_post_id: postId });
  if (error) throw error;
}

export async function pinChannelPost(channelId: string, postId: string) {
  const { error } = await supabase.rpc("pin_channel_post", { p_channel_id: channelId, p_post_id: postId });
  if (error) throw error;
}

export async function unpinChannelPost(postId: string) {
  const { error } = await supabase.rpc("unpin_channel_post", { p_post_id: postId });
  if (error) throw error;
}

export async function toggleChannelPostLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from("channel_post_likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("channel_post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  }
}

export type ChannelPostComment = { id: string; post_id: string; author_id: string; text: string; created_at: string; author: Profile };

export async function listChannelPostComments(postId: string): Promise<ChannelPostComment[]> {
  const { data, error } = await supabase
    .from("channel_post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const authorIds = [...new Set(data.map((c) => c.author_id))];
  const { data: authors } = await supabase.from("profiles").select("*").in("id", authorIds);
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));
  return data.map((c) => ({ ...c, author: authorById.get(c.author_id)! })).filter((c) => !!c.author);
}

export async function addChannelPostComment(postId: string, authorId: string, text: string) {
  const { error } = await supabase.from("channel_post_comments").insert({ post_id: postId, author_id: authorId, text });
  if (error) throw error;
}

// ---------- group chat encryption ----------

export type GroupMemberKey = { id: string; public_key_jwk: JsonWebKey | null };

export async function listGroupMemberKeys(groupId: string): Promise<GroupMemberKey[]> {
  const { data: members, error } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
  if (error) throw error;
  const memberIds = (members ?? []).map((m) => m.user_id);
  if (memberIds.length === 0) return [];
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, public_key_jwk").in("id", memberIds);
  if (profileError) throw profileError;
  return (profiles ?? []).map((p) => ({ id: p.id, public_key_jwk: p.public_key_jwk as unknown as JsonWebKey | null }));
}

export type GroupKeyWrap = {
  member_id: string;
  wrapped_key: string;
  wrapped_iv: string;
  wrapper_public_key_jwk: JsonWebKey;
};

export async function listGroupKeyWraps(groupId: string): Promise<GroupKeyWrap[]> {
  const { data, error } = await supabase.from("group_keys").select("*").eq("group_id", groupId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    member_id: row.member_id,
    wrapped_key: row.wrapped_key,
    wrapped_iv: row.wrapped_iv,
    wrapper_public_key_jwk: row.wrapper_public_key_jwk as unknown as JsonWebKey,
  }));
}

export async function insertGroupKeyWraps(
  groupId: string,
  wraps: { memberId: string; wrappedKey: string; wrappedIv: string; wrapperPublicJwk: JsonWebKey }[]
) {
  if (wraps.length === 0) return;
  const { error } = await supabase.from("group_keys").insert(
    wraps.map((w) => ({
      group_id: groupId,
      member_id: w.memberId,
      wrapped_key: w.wrappedKey,
      wrapped_iv: w.wrappedIv,
      wrapper_public_key_jwk: w.wrapperPublicJwk as unknown as Database["public"]["Tables"]["group_keys"]["Row"]["wrapper_public_key_jwk"],
    }))
  );
  if (error) throw error;
}

export async function enableGroupEncryption(groupId: string) {
  const { error } = await supabase.rpc("enable_group_encryption", { p_group_id: groupId });
  if (error) throw error;
}

export async function sendEncryptedGroupMessage(
  conversationId: string,
  senderId: string,
  ciphertext: string,
  iv: string,
  replyToId?: string,
  topicId?: string | null
) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, ciphertext, iv, reply_to_id: replyToId ?? null, topic_id: topicId ?? null });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, "🔒 New message").catch(() => {});
}

// ---------- marketplace ----------

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  created_at: string;
  seller: Profile;
};

export async function listMarketplaceListings(): Promise<Listing[]> {
  const { data: listings, error } = await supabase
    .from("marketplace_listings")
    .select("id, title, description, price, category, created_at, seller_id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!listings || listings.length === 0) return [];

  const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
  const { data: sellers } = await supabase.from("profiles").select("*").in("id", sellerIds);
  const sellerById = new Map((sellers ?? []).map((s) => [s.id, s]));

  return listings
    .map((l) => {
      const seller = sellerById.get(l.seller_id);
      if (!seller) return null;
      return {
        id: l.id,
        title: l.title,
        description: l.description,
        price: Number(l.price),
        category: l.category,
        created_at: l.created_at,
        seller,
      };
    })
    .filter((l): l is Listing => l !== null);
}

export async function createListing(
  sellerId: string,
  title: string,
  description: string,
  price: number,
  category: string
) {
  const { error } = await supabase
    .from("marketplace_listings")
    .insert({ seller_id: sellerId, title, description: description || null, price, category: category || null });
  if (error) throw error;
}

// ---------- events ----------

export type VyroEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  created_at: string;
  host: Profile;
  going_count: number;
  my_status: "going" | "interested" | null;
};

export async function listEvents(userId: string): Promise<VyroEvent[]> {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, description, location, starts_at, created_at, host_id")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  if (!events || events.length === 0) return [];

  const hostIds = [...new Set(events.map((e) => e.host_id))];
  const eventIds = events.map((e) => e.id);
  const [{ data: hosts }, { data: rsvps }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", hostIds),
    supabase.from("event_rsvps").select("event_id, user_id, status").in("event_id", eventIds),
  ]);
  const hostById = new Map((hosts ?? []).map((h) => [h.id, h]));
  const goingCounts = new Map<string, number>();
  const myStatus = new Map<string, "going" | "interested">();
  for (const r of rsvps ?? []) {
    if (r.status === "going") goingCounts.set(r.event_id, (goingCounts.get(r.event_id) ?? 0) + 1);
    if (r.user_id === userId) myStatus.set(r.event_id, r.status as "going" | "interested");
  }

  return events
    .map((e) => {
      const host = hostById.get(e.host_id);
      if (!host) return null;
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        starts_at: e.starts_at,
        created_at: e.created_at,
        host,
        going_count: goingCounts.get(e.id) ?? 0,
        my_status: myStatus.get(e.id) ?? null,
      };
    })
    .filter((e): e is VyroEvent => e !== null);
}

export async function createEvent(
  hostId: string,
  title: string,
  description: string,
  location: string,
  startsAt: string
) {
  const { error } = await supabase
    .from("events")
    .insert({ host_id: hostId, title, description: description || null, location: location || null, starts_at: startsAt });
  if (error) throw error;
}

export async function setRsvp(eventId: string, userId: string, status: "going" | "interested" | null) {
  if (status === null) {
    const { error } = await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: userId, status });
  if (error) throw error;
}

// ---------- stories ----------

export type StoryWithAuthor = {
  id: string;
  caption: string | null;
  image_url: string | null;
  video_url: string | null;
  audience: string;
  created_at: string;
  author: Profile;
};

export async function listActiveStories(): Promise<StoryWithAuthor[]> {
  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, caption, image_url, video_url, audience, created_at, author_id")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!stories || stories.length === 0) return [];

  const authorIds = [...new Set(stories.map((s) => s.author_id))];
  const { data: authors } = await supabase.from("profiles").select("*").in("id", authorIds);
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));

  return stories
    .map((s) => {
      const author = authorById.get(s.author_id);
      if (!author) return null;
      return {
        id: s.id,
        caption: s.caption,
        image_url: s.image_url,
        video_url: s.video_url,
        audience: s.audience,
        created_at: s.created_at,
        author,
      };
    })
    .filter((s): s is StoryWithAuthor => s !== null);
}

export async function createStory(
  authorId: string,
  caption: string,
  imageUrl?: string,
  videoUrl?: string,
  audience: "everyone" | "close_friends" = "everyone"
) {
  const { error } = await supabase
    .from("stories")
    .insert({ author_id: authorId, caption: caption || null, image_url: imageUrl ?? null, video_url: videoUrl ?? null, audience });
  if (error) throw error;
}

export async function recordStoryView(storyId: string, viewerId: string) {
  const { error } = await supabase.from("story_views").upsert({ story_id: storyId, viewer_id: viewerId });
  if (error) throw error;
}

export async function listSeenStoryIds(viewerId: string): Promise<Set<string>> {
  const { data } = await supabase.from("story_views").select("story_id").eq("viewer_id", viewerId);
  return new Set((data ?? []).map((v) => v.story_id));
}

export async function listCloseFriends(userId: string): Promise<Profile[]> {
  const { data: rows, error } = await supabase.from("close_friends").select("friend_id").eq("user_id", userId);
  if (error) throw error;
  const ids = (rows ?? []).map((r) => r.friend_id);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  return data ?? [];
}

export async function addCloseFriend(userId: string, friendId: string) {
  const { error } = await supabase.from("close_friends").insert({ user_id: userId, friend_id: friendId });
  if (error) throw error;
}

export async function removeCloseFriend(userId: string, friendId: string) {
  const { error } = await supabase.from("close_friends").delete().eq("user_id", userId).eq("friend_id", friendId);
  if (error) throw error;
}

// ---------- story highlights ----------
// A highlight item snapshots a story's media/caption at the moment it's
// added, rather than referencing the `stories` row live — that row's own
// RLS makes it unreadable once expires_at passes, but a highlight is meant
// to outlive that by design.

export type StoryHighlight = {
  id: string;
  owner_id: string;
  title: string;
  cover_image_url: string | null;
  position: number;
  created_at: string;
};

export type StoryHighlightItem = {
  id: string;
  highlight_id: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  position: number;
  created_at: string;
};

export async function getStoryHighlight(highlightId: string): Promise<StoryHighlight | null> {
  const { data, error } = await supabase.from("story_highlights").select("*").eq("id", highlightId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listStoryHighlights(ownerId: string): Promise<StoryHighlight[]> {
  const { data, error } = await supabase
    .from("story_highlights")
    .select("*")
    .eq("owner_id", ownerId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listHighlightItems(highlightId: string): Promise<StoryHighlightItem[]> {
  const { data, error } = await supabase
    .from("story_highlight_items")
    .select("*")
    .eq("highlight_id", highlightId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createStoryHighlight(
  ownerId: string,
  title: string,
  imageUrl: string | null,
  videoUrl: string | null,
  caption: string | null
): Promise<string> {
  const highlightId = crypto.randomUUID();
  const { error: highlightError } = await supabase
    .from("story_highlights")
    .insert({ id: highlightId, owner_id: ownerId, title, cover_image_url: imageUrl });
  if (highlightError) throw highlightError;
  const { error: itemError } = await supabase
    .from("story_highlight_items")
    .insert({ highlight_id: highlightId, image_url: imageUrl, video_url: videoUrl, caption });
  if (itemError) throw itemError;
  return highlightId;
}

export async function addStoryToHighlight(highlightId: string, imageUrl: string | null, videoUrl: string | null, caption: string | null) {
  const { error } = await supabase
    .from("story_highlight_items")
    .insert({ highlight_id: highlightId, image_url: imageUrl, video_url: videoUrl, caption });
  if (error) throw error;
}

export async function deleteStoryHighlight(highlightId: string) {
  const { error } = await supabase.from("story_highlights").delete().eq("id", highlightId);
  if (error) throw error;
}

export type StoryViewer = { profile: Profile; viewed_at: string };

export async function listStoryViewers(storyId: string): Promise<StoryViewer[]> {
  const { data: views, error } = await supabase
    .from("story_views")
    .select("viewer_id, viewed_at")
    .eq("story_id", storyId)
    .order("viewed_at", { ascending: false });
  if (error) throw error;
  if (!views || views.length === 0) return [];
  const viewerIds = views.map((v) => v.viewer_id);
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", viewerIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return views
    .map((v) => {
      const profile = profileById.get(v.viewer_id);
      return profile ? { profile, viewed_at: v.viewed_at } : null;
    })
    .filter((v): v is StoryViewer => v !== null);
}

// A story reply (including a quick-reaction tap) is a normal DM with a
// story_id + a snapshot of the story's preview captured at send-time — the
// `stories` row itself becomes unreadable via RLS once it expires, so the
// reply needs its own copy to keep rendering a thumbnail/caption correctly.
export async function sendStoryReply(
  conversationId: string,
  senderId: string,
  text: string,
  storyId: string,
  storyPreviewImageUrl: string | null,
  storyPreviewText: string | null
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    text,
    story_id: storyId,
    story_preview_image_url: storyPreviewImageUrl,
    story_preview_text: storyPreviewText,
  });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, text).catch(() => {});
}

// ---------- wallet / gifts ----------

export async function getCoinBalance(userId: string): Promise<number> {
  const { data } = await supabase.from("profiles").select("coins").eq("id", userId).single();
  return data?.coins ?? 0;
}

export type CoinTransaction = { id: string; delta: number; reason: string; created_at: string };

export async function listTransactions(userId: string): Promise<CoinTransaction[]> {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("id, delta, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function sendGift(receiverId: string, giftKey: string, coinCost: number, liveId?: string) {
  const { error } = await supabase.rpc("send_gift", {
    p_receiver_id: receiverId,
    p_gift_key: giftKey,
    p_coin_cost: coinCost,
    p_live_id: liveId ?? null,
  });
  if (error) throw error;
}

// ---------- creator subscriptions ----------
// A fan-support subscription is just a recurring coin transfer against the
// same wallet send_gift() already spends from — there's no real payment
// processor and no auto-renewal; renews_at simply marks when the fan needs
// to tap Subscribe again to keep their access current.

export type CreatorSubscription = {
  id: string;
  subscriber_id: string;
  creator_id: string;
  coin_cost: number;
  started_at: string;
  renews_at: string;
};

export async function setSubscriptionPrice(userId: string, priceCoins: number) {
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_price_coins: Math.max(0, Math.round(priceCoins)) })
    .eq("id", userId);
  if (error) throw error;
}

export async function subscribeToCreator(creatorId: string) {
  const { error } = await supabase.rpc("subscribe_to_creator", { p_creator_id: creatorId });
  if (error) throw error;
}

export async function getMySubscription(subscriberId: string, creatorId: string): Promise<CreatorSubscription | null> {
  const { data } = await supabase
    .from("creator_subscriptions")
    .select("*")
    .eq("subscriber_id", subscriberId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  return data ?? null;
}

export async function listMySubscriptions(subscriberId: string): Promise<(CreatorSubscription & { creator: Profile })[]> {
  const { data, error } = await supabase
    .from("creator_subscriptions")
    .select("*")
    .eq("subscriber_id", subscriberId)
    .order("renews_at", { ascending: false });
  if (error) throw error;
  const subs = data ?? [];
  if (subs.length === 0) return [];

  const creatorIds = [...new Set(subs.map((s) => s.creator_id))];
  const { data: creators } = await supabase.from("profiles").select("*").in("id", creatorIds);
  const creatorById = new Map((creators ?? []).map((p) => [p.id, p]));

  return subs.flatMap((s) => {
    const creator = creatorById.get(s.creator_id);
    return creator ? [{ ...s, creator }] : [];
  });
}

export async function countSubscribers(creatorId: string): Promise<number> {
  const { count } = await supabase
    .from("creator_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .gt("renews_at", new Date().toISOString());
  return count ?? 0;
}

// ---------- creator studio ----------

export type CreatorStats = {
  followers: number;
  following: number;
  posts: number;
  totalLikes: number;
  totalComments: number;
};

export async function getCreatorStats(userId: string): Promise<CreatorStats> {
  const [followers, following, myPosts] = await Promise.all([
    countFollowers(userId),
    countFollowing(userId),
    supabase.from("posts").select("id").eq("author_id", userId),
  ]);
  const postIds = (myPosts.data ?? []).map((p) => p.id);
  if (postIds.length === 0) {
    return { followers, following, posts: 0, totalLikes: 0, totalComments: 0 };
  }
  const [{ count: totalLikes }, { count: totalComments }] = await Promise.all([
    supabase.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", postIds),
    supabase.from("post_comments").select("*", { count: "exact", head: true }).in("post_id", postIds),
  ]);
  return {
    followers,
    following,
    posts: postIds.length,
    totalLikes: totalLikes ?? 0,
    totalComments: totalComments ?? 0,
  };
}

export async function recordVideoWatch(
  postId: string,
  viewerId: string,
  watchedSeconds: number,
  durationSeconds: number | null,
  replayed = false
) {
  const { error } = await supabase.from("video_watch_events").insert({
    post_id: postId,
    viewer_id: viewerId,
    watched_seconds: watchedSeconds,
    video_duration_seconds: durationSeconds,
    completed: durationSeconds != null && watchedSeconds >= durationSeconds - 0.5,
    replayed,
  });
  if (error) throw error;
}

export type WatchSignal = {
  post_id: string;
  watched_seconds: number;
  video_duration_seconds: number | null;
  completed: boolean;
  replayed: boolean;
};

export async function listMyWatchSignals(userId: string, limit = 300): Promise<WatchSignal[]> {
  const { data, error } = await supabase
    .from("video_watch_events")
    .select("post_id, watched_seconds, video_duration_seconds, completed, replayed")
    .eq("viewer_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listPostTexts(postIds: string[]): Promise<Map<string, string>> {
  if (postIds.length === 0) return new Map();
  const { data } = await supabase.from("posts").select("id, text").in("id", [...new Set(postIds)]);
  return new Map((data ?? []).map((p) => [p.id, p.text]));
}

export type VideoPostStat = {
  id: string;
  text: string;
  cover_url: string | null;
  video_duration_seconds: number | null;
  created_at: string;
  views: number;
  avgWatchedSeconds: number;
  completionRate: number;
};

export async function listMyVideoStats(userId: string): Promise<VideoPostStat[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, text, cover_url, video_duration_seconds, created_at")
    .eq("author_id", userId)
    .not("video_url", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const { data: events } = await supabase
    .from("video_watch_events")
    .select("post_id, watched_seconds, completed")
    .in("post_id", postIds);

  const byPost = new Map<string, { count: number; totalWatched: number; completed: number }>();
  for (const e of events ?? []) {
    const cur = byPost.get(e.post_id) ?? { count: 0, totalWatched: 0, completed: 0 };
    cur.count += 1;
    cur.totalWatched += Number(e.watched_seconds);
    if (e.completed) cur.completed += 1;
    byPost.set(e.post_id, cur);
  }

  return posts.map((p) => {
    const agg = byPost.get(p.id) ?? { count: 0, totalWatched: 0, completed: 0 };
    return {
      id: p.id,
      text: p.text,
      cover_url: p.cover_url,
      video_duration_seconds: p.video_duration_seconds,
      created_at: p.created_at,
      views: agg.count,
      avgWatchedSeconds: agg.count > 0 ? agg.totalWatched / agg.count : 0,
      completionRate: agg.count > 0 ? Math.round((agg.completed / agg.count) * 100) : 0,
    };
  });
}

export async function getVideoRetention(
  postId: string,
  durationSeconds: number,
  buckets = 10
): Promise<{ curve: number[]; sampleSize: number }> {
  const { data, error } = await supabase.from("video_watch_events").select("watched_seconds").eq("post_id", postId);
  if (error) throw error;
  const watched = (data ?? []).map((e) => Number(e.watched_seconds));
  if (watched.length === 0 || durationSeconds <= 0) return { curve: new Array(buckets + 1).fill(0), sampleSize: 0 };
  // buckets + 1 points from 0% to 100% of the duration, inclusive, so the last point is a true "reached the end" figure
  const curve = Array.from({ length: buckets + 1 }, (_, i) => {
    const t = (i / buckets) * durationSeconds;
    const reached = watched.filter((w) => w >= t).length;
    return Math.round((reached / watched.length) * 100);
  });
  return { curve, sampleSize: watched.length };
}

// ---------- calls ----------

export async function logCall(
  callerId: string,
  calleeId: string,
  kind: "voice" | "video",
  outcome: "completed" | "missed" | "declined",
  durationSeconds: number
) {
  const { error } = await supabase
    .from("call_logs")
    .insert({ caller_id: callerId, callee_id: calleeId, kind, outcome, duration_seconds: durationSeconds });
  if (error) throw error;
}

export type CallLogEntry = {
  id: string;
  kind: string;
  outcome: string;
  created_at: string;
  other: Profile;
  direction: "in" | "out";
};

export async function listCallLogs(userId: string): Promise<CallLogEntry[]> {
  const { data, error } = await supabase
    .from("call_logs")
    .select("id, kind, outcome, created_at, caller_id, callee_id")
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const otherIds = [...new Set(data.map((c) => (c.caller_id === userId ? c.callee_id : c.caller_id)))];
  const { data: others } = await supabase.from("profiles").select("*").in("id", otherIds);
  const otherById = new Map((others ?? []).map((o) => [o.id, o]));

  return data
    .map((c) => {
      const otherId = c.caller_id === userId ? c.callee_id : c.caller_id;
      const other = otherById.get(otherId);
      if (!other) return null;
      return {
        id: c.id,
        kind: c.kind,
        outcome: c.outcome,
        created_at: c.created_at,
        other,
        direction: (c.caller_id === userId ? "out" : "in") as "in" | "out",
      };
    })
    .filter((c): c is CallLogEntry => c !== null);
}

// ---------- live streaming ----------

export type LiveSession = Database["public"]["Tables"]["live_sessions"]["Row"];
export type LiveSessionWithHost = LiveSession & { host: Profile };

export async function createLiveSession(
  hostId: string,
  title: string,
  category: string,
  privacy: "public" | "followers" | "private"
): Promise<LiveSession> {
  const { data, error } = await supabase
    .from("live_sessions")
    .insert({ host_id: hostId, title, category, privacy })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function goLive(liveId: string) {
  const { data, error } = await supabase
    .from("live_sessions")
    .update({ status: "live", started_at: new Date().toISOString() })
    .eq("id", liveId)
    .select("host_id, title")
    .single();
  if (error) throw error;
  notifyFollowersLive(data.host_id, liveId, data.title).catch(() => {});
}

export async function endLive(liveId: string) {
  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", liveId);
  if (error) throw error;
}

export async function updatePeakViewers(liveId: string, count: number) {
  const { data: current } = await supabase.from("live_sessions").select("peak_viewers").eq("id", liveId).single();
  if (current && count > current.peak_viewers) {
    await supabase.from("live_sessions").update({ peak_viewers: count }).eq("id", liveId);
  }
}

export async function setReplay(liveId: string, replayUrl: string) {
  const { error } = await supabase
    .from("live_sessions")
    .update({ replay_url: replayUrl, replay_ready: true, status: "replay_ready" })
    .eq("id", liveId);
  if (error) throw error;
}

async function hydrateLiveSessions(sessions: LiveSession[]): Promise<LiveSessionWithHost[]> {
  if (sessions.length === 0) return [];
  const hostIds = [...new Set(sessions.map((s) => s.host_id))];
  const { data: hosts } = await supabase.from("profiles").select("*").in("id", hostIds);
  const hostById = new Map((hosts ?? []).map((h) => [h.id, h]));
  return sessions
    .map((s) => {
      const host = hostById.get(s.host_id);
      if (!host) return null;
      return { ...s, host };
    })
    .filter((s): s is LiveSessionWithHost => s !== null);
}

export async function getLiveSession(liveId: string): Promise<LiveSessionWithHost | null> {
  const { data } = await supabase.from("live_sessions").select("*").eq("id", liveId).single();
  if (!data) return null;
  const hydrated = await hydrateLiveSessions([data]);
  return hydrated[0] ?? null;
}

export async function listLiveNow(userId: string): Promise<LiveSessionWithHost[]> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const hydrated = await hydrateLiveSessions(data ?? []);

  const following = await listFollowing(userId);
  return hydrated.sort((a, b) => {
    const aFollowed = following.has(a.host_id) ? 1 : 0;
    const bFollowed = following.has(b.host_id) ? 1 : 0;
    if (aFollowed !== bFollowed) return bFollowed - aFollowed;
    if (a.peak_viewers !== b.peak_viewers) return b.peak_viewers - a.peak_viewers;
    return (b.started_at ?? "").localeCompare(a.started_at ?? "");
  });
}

export async function listMyLiveHistory(hostId: string): Promise<LiveSession[]> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("host_id", hostId)
    .neq("status", "created")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- live chat ----------

export type LiveMessage = { id: string; text: string; pinned: boolean; created_at: string; sender: Profile };

export async function listLiveMessages(liveId: string): Promise<LiveMessage[]> {
  const { data, error } = await supabase
    .from("live_messages")
    .select("id, text, pinned, created_at, sender_id")
    .eq("live_id", liveId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const senderIds = [...new Set(data.map((m) => m.sender_id))];
  const { data: senders } = await supabase.from("profiles").select("*").in("id", senderIds);
  const senderById = new Map((senders ?? []).map((s) => [s.id, s]));
  return data
    .map((m) => {
      const sender = senderById.get(m.sender_id);
      if (!sender) return null;
      return { id: m.id, text: m.text, pinned: m.pinned, created_at: m.created_at, sender };
    })
    .filter((m): m is LiveMessage => m !== null);
}

export async function sendLiveMessage(liveId: string, senderId: string, text: string) {
  const { error } = await supabase.from("live_messages").insert({ live_id: liveId, sender_id: senderId, text });
  if (error) throw error;
}

export function subscribeToLiveMessages(liveId: string, onInsert: (raw: { id: string; sender_id: string; text: string; pinned: boolean; created_at: string }) => void) {
  const channel = supabase
    .channel(`live-messages:${liveId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "live_messages", filter: `live_id=eq.${liveId}` },
      (payload) => onInsert(payload.new as { id: string; sender_id: string; text: string; pinned: boolean; created_at: string })
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function pinLiveMessage(messageId: string, pinned: boolean) {
  const { error } = await supabase.from("live_messages").update({ pinned }).eq("id", messageId);
  if (error) throw error;
}

export async function deleteLiveMessage(messageId: string) {
  const { error } = await supabase.from("live_messages").delete().eq("id", messageId);
  if (error) throw error;
}

export async function blockLiveViewer(liveId: string, userId: string) {
  const { error } = await supabase.from("live_blocked_viewers").insert({ live_id: liveId, user_id: userId });
  if (error) throw error;
}

// ---------- viewer session tracking (real analytics) ----------

export async function joinLiveAsViewer(liveId: string, viewerId: string): Promise<string> {
  const { data, error } = await supabase
    .from("live_viewer_sessions")
    .insert({ live_id: liveId, viewer_id: viewerId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function leaveLiveAsViewer(viewerSessionId: string) {
  await supabase.from("live_viewer_sessions").update({ left_at: new Date().toISOString() }).eq("id", viewerSessionId);
}

export type LiveAnalytics = {
  peakViewers: number;
  uniqueViewers: number;
  avgWatchSeconds: number;
  totalGiftCoins: number;
  newFollowers: number;
  durationSeconds: number;
};

export async function getLiveAnalytics(live: LiveSession): Promise<LiveAnalytics> {
  const [{ data: viewerSessions }, { data: gifts }] = await Promise.all([
    supabase.from("live_viewer_sessions").select("viewer_id, joined_at, left_at").eq("live_id", live.id),
    supabase.from("gifts_sent").select("coin_cost").eq("live_id", live.id),
  ]);

  const uniqueViewers = new Set((viewerSessions ?? []).map((v) => v.viewer_id)).size;
  const watchTimes = (viewerSessions ?? []).map((v) => {
    const end = v.left_at ? new Date(v.left_at).getTime() : Date.now();
    return Math.max(0, (end - new Date(v.joined_at).getTime()) / 1000);
  });
  const avgWatchSeconds = watchTimes.length > 0 ? watchTimes.reduce((a, b) => a + b, 0) / watchTimes.length : 0;
  const totalGiftCoins = (gifts ?? []).reduce((sum, g) => sum + g.coin_cost, 0);
  const durationSeconds =
    live.started_at && live.ended_at
      ? (new Date(live.ended_at).getTime() - new Date(live.started_at).getTime()) / 1000
      : 0;

  return {
    peakViewers: live.peak_viewers,
    uniqueViewers,
    avgWatchSeconds: Math.round(avgWatchSeconds),
    totalGiftCoins,
    newFollowers: 0,
    durationSeconds: Math.round(durationSeconds),
  };
}

// ---------- polls ----------

export type LivePoll = {
  id: string;
  live_id: string;
  question: string;
  options: string[];
  closed_at: string | null;
  created_at: string;
};

export async function createLivePoll(liveId: string, question: string, options: string[]): Promise<LivePoll> {
  const { data, error } = await supabase
    .from("live_polls")
    .insert({ live_id: liveId, question, options })
    .select("*")
    .single();
  if (error) throw error;
  return { ...data, options: data.options as string[] };
}

export async function getActiveLivePoll(liveId: string): Promise<LivePoll | null> {
  const { data } = await supabase
    .from("live_polls")
    .select("*")
    .eq("live_id", liveId)
    .is("closed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { ...data, options: data.options as string[] };
}

export async function closeLivePoll(pollId: string) {
  const { error } = await supabase.from("live_polls").update({ closed_at: new Date().toISOString() }).eq("id", pollId);
  if (error) throw error;
}

export async function voteLivePoll(pollId: string, userId: string, optionIndex: number) {
  const { error } = await supabase.from("live_poll_votes").insert({ poll_id: pollId, user_id: userId, option_index: optionIndex });
  if (error) throw error;
}

export async function getLivePollVotes(pollId: string): Promise<{ option_index: number; user_id: string }[]> {
  const { data, error } = await supabase.from("live_poll_votes").select("option_index, user_id").eq("poll_id", pollId);
  if (error) throw error;
  return data ?? [];
}

export function subscribeToLivePollVotes(pollId: string, onChange: () => void) {
  const channel = supabase
    .channel(`live-poll-votes:${pollId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_poll_votes", filter: `poll_id=eq.${pollId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------- co-host / guests ----------

export type LiveGuest = { id: string; status: string; joined_at: string | null; guest: Profile };

export async function inviteLiveGuest(liveId: string, guestId: string): Promise<string> {
  const { data, error } = await supabase
    .from("live_guests")
    .insert({ live_id: liveId, guest_id: guestId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function respondToGuestInvite(guestRowId: string, accept: boolean) {
  const { error } = await supabase
    .from("live_guests")
    .update({ status: accept ? "accepted" : "declined", joined_at: accept ? new Date().toISOString() : null })
    .eq("id", guestRowId);
  if (error) throw error;
}

export async function removeLiveGuest(guestRowId: string) {
  const { error } = await supabase
    .from("live_guests")
    .update({ status: "removed", left_at: new Date().toISOString() })
    .eq("id", guestRowId);
  if (error) throw error;
}

export async function listLiveGuests(liveId: string): Promise<LiveGuest[]> {
  const { data, error } = await supabase
    .from("live_guests")
    .select("id, status, joined_at, guest_id")
    .eq("live_id", liveId)
    .in("status", ["invited", "accepted"]);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const guestIds = data.map((g) => g.guest_id);
  const { data: guests } = await supabase.from("profiles").select("*").in("id", guestIds);
  const guestById = new Map((guests ?? []).map((g) => [g.id, g]));
  return data
    .map((g) => {
      const guest = guestById.get(g.guest_id);
      if (!guest) return null;
      return { id: g.id, status: g.status, joined_at: g.joined_at, guest };
    })
    .filter((g): g is LiveGuest => g !== null);
}

// ---------- live match / battle ----------

export type LiveMatch = {
  id: string;
  live_id_a: string;
  live_id_b: string;
  started_at: string;
  ends_at: string;
  status: string;
  winner_live_id: string | null;
};

export async function createLiveMatch(liveIdA: string, liveIdB: string, durationSeconds: number): Promise<LiveMatch> {
  const endsAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
  const { data, error } = await supabase
    .from("live_matches")
    .insert({ live_id_a: liveIdA, live_id_b: liveIdB, ends_at: endsAt })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getActiveMatchForLive(liveId: string): Promise<LiveMatch | null> {
  const { data } = await supabase
    .from("live_matches")
    .select("*")
    .or(`live_id_a.eq.${liveId},live_id_b.eq.${liveId}`)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getMatchScore(matchId: string): Promise<{ scoreA: number; scoreB: number }> {
  const { data, error } = await supabase.rpc("get_match_score", { p_match_id: matchId });
  if (error) throw error;
  const row = data?.[0];
  return { scoreA: Number(row?.score_a ?? 0), scoreB: Number(row?.score_b ?? 0) };
}

export async function endLiveMatch(matchId: string, winnerLiveId: string | null) {
  const { error } = await supabase.from("live_matches").update({ status: "ended", winner_live_id: winnerLiveId }).eq("id", matchId);
  if (error) throw error;
}

// ---------- live reports ----------

export async function reportLive(liveId: string, reporterId: string, reason: string, details: string) {
  const { error } = await supabase
    .from("live_reports")
    .insert({ live_id: liveId, reporter_id: reporterId, reason, details: details || null });
  if (error) throw error;
}

// ---------- live realtime helpers ----------

export function subscribeToLiveSession(liveId: string, onUpdate: (row: LiveSession) => void) {
  const channel = supabase
    .channel(`live-session:${liveId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${liveId}` },
      (payload) => onUpdate(payload.new as LiveSession)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getMyGuestInvite(liveId: string, userId: string): Promise<LiveGuest | null> {
  const { data } = await supabase
    .from("live_guests")
    .select("id, status, joined_at, guest_id")
    .eq("live_id", liveId)
    .eq("guest_id", userId)
    .in("status", ["invited", "accepted"])
    .maybeSingle();
  if (!data) return null;
  const { data: guest } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!guest) return null;
  return { id: data.id, status: data.status, joined_at: data.joined_at, guest };
}

export function subscribeToLiveGuests(liveId: string, onChange: (row: { id: string; guest_id: string; status: string }) => void) {
  const channel = supabase
    .channel(`live-guests:${liveId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_guests", filter: `live_id=eq.${liveId}` },
      (payload) => onChange((payload.new ?? payload.old) as { id: string; guest_id: string; status: string })
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export type LiveGiftEvent = { sender: Profile; gift_key: string; coin_cost: number; created_at: string };

export function subscribeToLiveGifts(liveId: string, onGift: (event: LiveGiftEvent) => void) {
  const channel = supabase
    .channel(`live-gifts:${liveId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "gifts_sent", filter: `live_id=eq.${liveId}` },
      async (payload) => {
        const row = payload.new as { sender_id: string; gift_key: string; coin_cost: number; created_at: string };
        const { data: sender } = await supabase.from("profiles").select("*").eq("id", row.sender_id).single();
        if (sender) onGift({ sender, gift_key: row.gift_key, coin_cost: row.coin_cost, created_at: row.created_at });
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToLiveMatchesFor(liveId: string, onChange: (row: LiveMatch) => void) {
  const channelA = supabase
    .channel(`live-match-a:${liveId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_matches", filter: `live_id_a=eq.${liveId}` },
      (payload) => onChange((payload.new ?? payload.old) as LiveMatch)
    )
    .subscribe();
  const channelB = supabase
    .channel(`live-match-b:${liveId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_matches", filter: `live_id_b=eq.${liveId}` },
      (payload) => onChange((payload.new ?? payload.old) as LiveMatch)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channelA);
    supabase.removeChannel(channelB);
  };
}

// ---------- communities ----------

export type Community = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  logo_url: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  my_role: "member" | "moderator" | "admin" | null;
};

async function hydrateCommunities(
  rows: Database["public"]["Tables"]["communities"]["Row"][],
  currentUserId: string
): Promise<Community[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((c) => c.id);
  const { data: members } = await supabase.from("community_members").select("community_id, user_id, role").in("community_id", ids);
  const counts = new Map<string, number>();
  const myRole = new Map<string, "member" | "moderator" | "admin">();
  for (const m of members ?? []) {
    counts.set(m.community_id, (counts.get(m.community_id) ?? 0) + 1);
    if (m.user_id === currentUserId) myRole.set(m.community_id, m.role as "member" | "moderator" | "admin");
  }
  return rows.map((c) => ({ ...c, member_count: counts.get(c.id) ?? 0, my_role: myRole.get(c.id) ?? null }));
}

export async function listCommunities(currentUserId: string): Promise<Community[]> {
  const { data, error } = await supabase.from("communities").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return hydrateCommunities(data ?? [], currentUserId);
}

export async function listMyCommunities(currentUserId: string): Promise<Community[]> {
  const { data: memberships } = await supabase.from("community_members").select("community_id").eq("user_id", currentUserId);
  const ids = (memberships ?? []).map((m) => m.community_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("communities").select("*").in("id", ids);
  if (error) throw error;
  return hydrateCommunities(data ?? [], currentUserId);
}

export async function getCommunity(communityId: string, currentUserId: string): Promise<Community | null> {
  const { data } = await supabase.from("communities").select("*").eq("id", communityId).single();
  if (!data) return null;
  const withCounts = await hydrateCommunities([data], currentUserId);
  return withCounts[0] ?? null;
}

export async function createCommunity(params: {
  name: string;
  description: string;
  category: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_community", {
    p_name: params.name,
    p_description: params.description || null,
    p_category: params.category || null,
    p_cover_url: params.coverUrl ?? null,
    p_logo_url: params.logoUrl ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function joinCommunity(communityId: string) {
  const { error } = await supabase.rpc("join_community", { p_community_id: communityId });
  if (error) throw error;
}

export async function leaveCommunity(communityId: string) {
  const { error } = await supabase.rpc("leave_community", { p_community_id: communityId });
  if (error) throw error;
}

export async function listCommunityMembers(communityId: string): Promise<(Profile & { role: string })[]> {
  const { data: members, error } = await supabase
    .from("community_members")
    .select("user_id, role")
    .eq("community_id", communityId);
  if (error) throw error;
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
  const roleById = new Map((members ?? []).map((m) => [m.user_id, m.role]));
  return (profiles ?? []).map((p) => ({ ...p, role: roleById.get(p.id) ?? "member" }));
}

export async function listCommunityPosts(communityId: string, currentUserId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, remix_type, remix_of_post_id, created_at, edited_at, author_id")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);
  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id, reaction").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
    listSavedPostIds(currentUserId),
  ]);
  return hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], currentUserId, savedPostIds);
}

export async function createCommunityPost(communityId: string, authorId: string, text: string, imageUrl?: string) {
  const { error } = await supabase
    .from("posts")
    .insert({ author_id: authorId, text, image_url: imageUrl ?? null, community_id: communityId });
  if (error) throw error;
}

// ---------- rewards ----------

export type DailyCheckin = { checkin_date: string; streak_count: number; reward_coins: number };

export async function getTodayCheckin(userId: string): Promise<DailyCheckin | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_checkins")
    .select("checkin_date, streak_count, reward_coins")
    .eq("user_id", userId)
    .eq("checkin_date", today)
    .maybeSingle();
  return data ?? null;
}

export async function getCurrentStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from("daily_checkins")
    .select("streak_count")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.streak_count ?? 0;
}

export async function claimDailyCheckin(): Promise<{ streak: number; reward: number }> {
  const { data, error } = await supabase.rpc("claim_daily_checkin");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { streak: row.streak, reward: row.reward };
}

export async function listReferrals(userId: string): Promise<number> {
  const { count } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId);
  return count ?? 0;
}

// ---------- reports & admin ----------

export type ReportTargetType = "post" | "user" | "comment" | "live_stream" | "marketplace_listing" | "community";

export async function submitReport(params: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: params.reporterId,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason,
    details: params.details ?? null,
  });
  if (error) throw error;
}

export type Report = Database["public"]["Tables"]["reports"]["Row"] & { reporter: Profile };

export async function listPendingReports(): Promise<Report[]> {
  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!reports || reports.length === 0) return [];
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
  const { data: reporters } = await supabase.from("profiles").select("*").in("id", reporterIds);
  const byId = new Map((reporters ?? []).map((p) => [p.id, p]));
  return reports.flatMap((r) => {
    const reporter = byId.get(r.reporter_id);
    return reporter ? [{ ...r, reporter }] : [];
  });
}

export async function resolveReport(reportId: string, status: "actioned" | "dismissed") {
  const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: reportId, p_status: status });
  if (error) throw error;
}

export async function adminDeletePost(postId: string) {
  const { error } = await supabase.rpc("admin_delete_post", { p_post_id: postId });
  if (error) throw error;
}

export async function adminSetUserStatus(userId: string, status: "active" | "suspended" | "banned") {
  const { error } = await supabase.rpc("admin_set_user_status", { p_user_id: userId, p_status: status });
  if (error) throw error;
}

export async function adminSearchUsers(query: string): Promise<Profile[]> {
  let req = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
  if (query.trim()) req = req.or(`username.ilike.%${query}%,name.ilike.%${query}%`);
  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
}

export type AdminDashboardCounts = {
  totalUsers: number;
  totalPosts: number;
  totalVideos: number;
  totalLiveStreams: number;
  pendingReports: number;
};

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const [users, posts, videos, live, reports] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }).not("video_url", "is", null),
    supabase.from("live_sessions").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return {
    totalUsers: users.count ?? 0,
    totalPosts: posts.count ?? 0,
    totalVideos: videos.count ?? 0,
    totalLiveStreams: live.count ?? 0,
    pendingReports: reports.count ?? 0,
  };
}

// ---------- inbox: comments & mentions ----------

export type CommentActivity = {
  id: string;
  text: string;
  created_at: string;
  post_id: string;
  post_text: string;
  author: Profile;
};

export async function listCommentsOnMyPosts(userId: string): Promise<CommentActivity[]> {
  const { data: myPosts } = await supabase.from("posts").select("id, text").eq("author_id", userId);
  const postIds = (myPosts ?? []).map((p) => p.id);
  if (postIds.length === 0) return [];
  const postTextById = new Map((myPosts ?? []).map((p) => [p.id, p.text]));

  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id, text, created_at, post_id, author_id")
    .in("post_id", postIds)
    .neq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const { data: authors } = await supabase.from("profiles").select("*").in("id", authorIds);
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));

  return comments.flatMap((c) => {
    const author = authorById.get(c.author_id);
    return author
      ? [{ id: c.id, text: c.text, created_at: c.created_at, post_id: c.post_id, post_text: postTextById.get(c.post_id) ?? "", author }]
      : [];
  });
}

export type MentionActivity = {
  id: string;
  kind: "post" | "comment";
  text: string;
  created_at: string;
  post_id: string;
  author: Profile;
};

export async function listMentionsOf(username: string, userId: string): Promise<MentionActivity[]> {
  const pattern = `%@${username}%`;
  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, text, created_at, author_id")
      .ilike("text", pattern)
      .neq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("post_comments")
      .select("id, text, created_at, post_id, author_id")
      .ilike("text", pattern)
      .neq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const authorIds = [...new Set([...(posts ?? []).map((p) => p.author_id), ...(comments ?? []).map((c) => c.author_id)])];
  const { data: authors } = authorIds.length > 0 ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] };
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));

  const postItems: MentionActivity[] = (posts ?? []).flatMap((p) => {
    const author = authorById.get(p.author_id);
    return author ? [{ id: p.id, kind: "post" as const, text: p.text, created_at: p.created_at, post_id: p.id, author }] : [];
  });
  const commentItems: MentionActivity[] = (comments ?? []).flatMap((c) => {
    const author = authorById.get(c.author_id);
    return author ? [{ id: c.id, kind: "comment" as const, text: c.text, created_at: c.created_at, post_id: c.post_id, author }] : [];
  });

  return [...postItems, ...commentItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getTodayRewardedWatchCount(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("video_watch_events")
    .select("id", { count: "exact", head: true })
    .eq("viewer_id", userId)
    .eq("completed", true)
    .gte("created_at", `${today}T00:00:00Z`);
  return Math.min(count ?? 0, 5);
}

export type TrendingHashtag = { tag: string; count: number };

export async function listTrendingHashtags(limit = 6): Promise<TrendingHashtag[]> {
  const { data: posts } = await supabase
    .from("posts")
    .select("text")
    .order("created_at", { ascending: false })
    .limit(200);

  const counts = new Map<string, number>();
  for (const p of posts ?? []) {
    const matches = p.text?.match(/#[a-zA-Z][a-zA-Z0-9_]*/g) ?? [];
    for (const raw of matches) {
      const tag = raw.toLowerCase();
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
