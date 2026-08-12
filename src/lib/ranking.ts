import type { FeedPost } from "./api";

/**
 * Real "hot"-style ranking (Reddit/HN-shaped): weighted engagement decayed by age,
 * with a boost for people you follow and for video posts. No AI involved —
 * purely a function of real likes, comments, follows, and recency.
 */
export function rankForYou(posts: FeedPost[], followingIds: Set<string>, currentUserId: string): FeedPost[] {
  const now = Date.now();
  return [...posts]
    .map((post) => {
      const ageHours = Math.max(0.5, (now - new Date(post.created_at).getTime()) / 3_600_000);
      const engagement = post.like_count * 3 + post.comment_count * 5;
      const recencyDecay = Math.pow(ageHours + 2, 1.35);
      const followBoost = post.author.id === currentUserId ? 0 : followingIds.has(post.author.id) ? 40 : 0;
      const videoBoost = post.video_url ? 8 : 0;
      const score = (engagement + followBoost + videoBoost + 5) / recencyDecay;
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.post);
}

export function filterFollowing(posts: FeedPost[], followingIds: Set<string>, currentUserId: string): FeedPost[] {
  return posts.filter((p) => p.author.id === currentUserId || followingIds.has(p.author.id));
}
