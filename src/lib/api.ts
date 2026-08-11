import { supabase } from "./supabase";
import type { Profile } from "../context/AuthContext";

export type FeedPost = {
  id: string;
  text: string;
  created_at: string;
  author: Profile;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
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

export async function updateProfile(id: string, patch: { name?: string; bio?: string; location?: string }) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function createPost(authorId: string, text: string) {
  const { error } = await supabase.from("posts").insert({ author_id: authorId, text });
  if (error) throw error;
}

export async function listFeedPosts(currentUserId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, text, created_at, author_id")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: authors }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
  ]);

  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));
  const likesByPost = new Map<string, { count: number; mine: boolean }>();
  for (const l of likes ?? []) {
    const cur = likesByPost.get(l.post_id) ?? { count: 0, mine: false };
    cur.count += 1;
    if (l.user_id === currentUserId) cur.mine = true;
    likesByPost.set(l.post_id, cur);
  }
  const commentsByPost = new Map<string, number>();
  for (const c of comments ?? []) {
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
        created_at: p.created_at,
        author,
        like_count: likeInfo.count,
        comment_count: commentsByPost.get(p.id) ?? 0,
        liked_by_me: likeInfo.mine,
      };
    })
    .filter((p): p is FeedPost => p !== null);
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
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
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
  }
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

export type SimplePost = { id: string; text: string; created_at: string };

export async function listPostsByAuthor(authorId: string): Promise<SimplePost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, text, created_at")
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
    .select("conversation_id, text, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastByConversation = new Map<string, { text: string; created_at: string }>();
  for (const m of lastMessages ?? []) {
    if (!lastByConversation.has(m.conversation_id)) {
      lastByConversation.set(m.conversation_id, { text: m.text, created_at: m.created_at });
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
        last_message: last?.text ?? null,
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
  text: string;
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
