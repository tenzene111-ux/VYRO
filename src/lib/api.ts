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

export type FeedPost = {
  id: string;
  text: string;
  image_url: string | null;
  video_url: string | null;
  cover_url: string | null;
  video_duration_seconds: number | null;
  comments_enabled: boolean;
  visibility: string;
  created_at: string;
  author: Profile;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
};

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

export async function createVideoPost(
  authorId: string,
  params: {
    caption: string;
    videoUrl: string;
    coverUrl: string | null;
    durationSeconds: number;
    visibility: "everyone" | "followers" | "only_me";
    commentsEnabled: boolean;
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
    created_at: string;
    author_id: string;
  }[],
  authors: Profile[],
  likes: { post_id: string; user_id: string }[],
  comments: { post_id: string }[],
  currentUserId: string,
  savedPostIds: Set<string> = new Set()
): FeedPost[] {
  const authorById = new Map(authors.map((a) => [a.id, a]));
  const likesByPost = new Map<string, { count: number; mine: boolean }>();
  for (const l of likes) {
    const cur = likesByPost.get(l.post_id) ?? { count: 0, mine: false };
    cur.count += 1;
    if (l.user_id === currentUserId) cur.mine = true;
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
      const likeInfo = likesByPost.get(p.id) ?? { count: 0, mine: false };
      return {
        id: p.id,
        text: p.text,
        image_url: p.image_url,
        video_url: p.video_url,
        cover_url: p.cover_url,
        video_duration_seconds: p.video_duration_seconds,
        comments_enabled: p.comments_enabled,
        visibility: p.visibility,
        created_at: p.created_at,
        author,
        like_count: likeInfo.count,
        comment_count: commentsByPost.get(p.id) ?? 0,
        liked_by_me: likeInfo.mine,
        saved_by_me: savedPostIds.has(p.id),
      };
    })
    .filter((p): p is FeedPost => p !== null);
}

export async function listFeedPosts(currentUserId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, created_at, author_id")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
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
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, created_at, author_id")
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: authors }, { data: likes }, { data: comments }, savedPostIds] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
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
      .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, created_at, author_id")
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
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
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
  created_at: string;
  author: Profile;
};

export async function listComments(postId: string): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id, post_id, text, created_at, author_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const { data: authors } = await supabase.from("profiles").select("*").in("id", authorIds);
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));

  return comments
    .map((c) => {
      const author = authorById.get(c.author_id);
      if (!author) return null;
      return { id: c.id, post_id: c.post_id, text: c.text, created_at: c.created_at, author };
    })
    .filter((c): c is Comment => c !== null);
}

export async function addComment(postId: string, authorId: string, text: string) {
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: authorId, text });
  if (error) throw error;
  notifyPostAction(postId, authorId, "comment").catch(() => {});
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
    .select("id, text, image_url, video_url, cover_url, video_duration_seconds, comments_enabled, visibility, created_at, author_id")
    .in("id", postIds);
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const [{ data: authors }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
  ]);

  const hydrated = hydrateFeedPosts(posts, authors ?? [], likes ?? [], comments ?? [], userId, new Set(postIds));
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
  if (!otherId) return null;
  return getProfile(otherId);
}

export type ChatConversation = {
  id: string;
  other: Profile;
  last_message: string | null;
  last_message_at: string | null;
};

export async function listConversations(userId: string): Promise<ChatConversation[]> {
  const { data: memberships, error } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  if (error) throw error;
  const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
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
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: lastMessages } = await supabase
    .from("messages")
    .select("conversation_id, text, audio_url, ciphertext, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastByConversation = new Map<
    string,
    { text: string | null; audio_url: string | null; ciphertext: string | null; created_at: string }
  >();
  for (const m of lastMessages ?? []) {
    if (!lastByConversation.has(m.conversation_id)) {
      lastByConversation.set(m.conversation_id, {
        text: m.text,
        audio_url: m.audio_url,
        ciphertext: m.ciphertext,
        created_at: m.created_at,
      });
    }
  }

  return conversationIds
    .map((id) => {
      const otherId = otherIdByConversation.get(id);
      const other = otherId ? profileById.get(otherId) : undefined;
      if (!other) return null;
      const last = lastByConversation.get(id);
      return {
        id,
        other,
        last_message: last
          ? last.text || (last.audio_url ? "🎤 Voice message" : last.ciphertext ? "🔒 Encrypted message" : "")
          : null,
        last_message_at: last?.created_at ?? null,
      };
    })
    .filter((c): c is ChatConversation => c !== null)
    .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
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

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({ is_group: false })
    .select("id")
    .single();
  if (error || !conversation) throw error ?? new Error("Failed to create conversation");

  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conversation.id, user_id: userId },
      { conversation_id: conversation.id, user_id: otherUserId },
    ]);
  if (memberError) throw memberError;

  return conversation.id;
}

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
  created_at: string;
};

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId: string, senderId: string, text: string) {
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, text });
  if (error) throw error;
  notifyConversationMembers(conversationId, senderId, text).catch(() => {});
}

export async function sendVoiceMessage(
  conversationId: string,
  senderId: string,
  audioUrl: string,
  durationSeconds: number
) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, audio_url: audioUrl, audio_duration_seconds: durationSeconds });
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
  recipientPublicJwk: JsonWebKey
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    ciphertext,
    iv,
    sender_public_key_jwk: senderPublicJwk as unknown as Database["public"]["Tables"]["profiles"]["Row"]["public_key_jwk"],
    recipient_public_key_jwk: recipientPublicJwk as unknown as Database["public"]["Tables"]["profiles"]["Row"]["public_key_jwk"],
  });
  if (error) throw error;
  // never leak plaintext through the push notification pipeline for an end-to-end encrypted message
  notifyConversationMembers(conversationId, senderId, "🔒 New message").catch(() => {});
}

export function subscribeToMessages(conversationId: string, onInsert: (message: ChatMessage) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as ChatMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
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
  caption: string;
  created_at: string;
  author: Profile;
};

export async function listActiveStories(): Promise<StoryWithAuthor[]> {
  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, caption, created_at, author_id")
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
      return { id: s.id, caption: s.caption, created_at: s.created_at, author };
    })
    .filter((s): s is StoryWithAuthor => s !== null);
}

export async function createStory(authorId: string, caption: string) {
  const { error } = await supabase.from("stories").insert({ author_id: authorId, caption });
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
