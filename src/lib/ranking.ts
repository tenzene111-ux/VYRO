import type { FeedPost, WatchSignal } from "./api";
import { matchedCategoryIds } from "./categories";

/**
 * Turns raw watch-time signals into a per-category interest score. A video
 * watched to completion or rewatched counts as a much stronger signal than a
 * video merely started; a video abandoned in the first 15% counts against
 * the topic. Categories are inferred from the post's own text via the same
 * keyword matcher Explore/Category discovery uses, so no separate tagging
 * step is needed.
 */
export function buildInterestProfile(events: WatchSignal[], textById: Map<string, string>): Record<string, number> {
  const profile: Record<string, number> = {};
  for (const e of events) {
    const text = textById.get(e.post_id);
    if (!text) continue;
    const cats = matchedCategoryIds(text);
    if (cats.length === 0) continue;

    const duration = e.video_duration_seconds ?? 0;
    const ratio = duration > 0 ? Math.min(1, e.watched_seconds / duration) : 0;
    let weight = 0;
    if (e.completed) weight += 3;
    if (e.replayed) weight += 2;
    if (!e.completed && ratio >= 0.5) weight += 1;
    if (ratio < 0.15) weight -= 1;
    if (weight === 0) continue;

    for (const cat of cats) profile[cat] = (profile[cat] ?? 0) + weight;
  }
  return profile;
}

/**
 * Real "hot"-style ranking (Reddit/HN-shaped): weighted engagement decayed by age,
 * with a boost for people you follow, video posts, and topics the viewer's watch
 * history shows real interest in. A small random jitter keeps the order from being
 * perfectly deterministic run to run, so the feed doesn't feel like a fixed loop.
 */
export function rankForYou(
  posts: FeedPost[],
  followingIds: Set<string>,
  currentUserId: string,
  interestProfile: Record<string, number> = {}
): FeedPost[] {
  const now = Date.now();
  return [...posts]
    .map((post) => {
      const ageHours = Math.max(0.5, (now - new Date(post.created_at).getTime()) / 3_600_000);
      const engagement = post.like_count * 3 + post.comment_count * 5;
      const recencyDecay = Math.pow(ageHours + 2, 1.35);
      const followBoost = post.author.id === currentUserId ? 0 : followingIds.has(post.author.id) ? 40 : 0;
      const videoBoost = post.video_url ? 8 : 0;
      const topicMatch = matchedCategoryIds(post.text).reduce((sum, c) => sum + (interestProfile[c] ?? 0), 0) * 6;
      const jitter = 0.92 + Math.random() * 0.16;
      const score = ((engagement + followBoost + videoBoost + topicMatch + 5) / recencyDecay) * jitter;
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.post);
}

export function filterFollowing(posts: FeedPost[], followingIds: Set<string>, currentUserId: string): FeedPost[] {
  return posts.filter((p) => p.author.id === currentUserId || followingIds.has(p.author.id));
}

/**
 * Trending is about growth rate, not totals — a post with 500 likes in 2
 * hours is "hotter" than one with 10,000 likes over 30 days. We don't store
 * time-bucketed engagement counters, so we approximate velocity as total
 * engagement divided by age: that's literally an average rate of
 * accumulation, and it naturally favors a post that racked up engagement
 * fast over an old post that merely accumulated a lot over a long time.
 * A small same-region boost adds real regional relevance when the viewer's
 * own profile location overlaps with the author's.
 */
/**
 * Creators (not already followed) whose recent posts (last 72h) show strong
 * average engagement — i.e. accelerating, not just a single lucky viral hit.
 */
export function pickRisingCreators(
  posts: FeedPost[],
  followingIds: Set<string>,
  currentUserId: string,
  limit = 6
): FeedPost["author"][] {
  const now = Date.now();
  const byAuthor = new Map<string, { author: FeedPost["author"]; score: number; count: number }>();
  for (const p of posts) {
    if (p.author.id === currentUserId || followingIds.has(p.author.id)) continue;
    const ageHours = (now - new Date(p.created_at).getTime()) / 3_600_000;
    if (ageHours > 72) continue;
    const cur = byAuthor.get(p.author.id) ?? { author: p.author, score: 0, count: 0 };
    cur.score += p.like_count * 3 + p.comment_count * 5;
    cur.count += 1;
    byAuthor.set(p.author.id, cur);
  }
  return [...byAuthor.values()]
    .sort((a, b) => b.score / b.count - a.score / a.count)
    .slice(0, limit)
    .map((c) => c.author);
}

export function rankTrending(posts: FeedPost[], viewerLocation?: string | null): FeedPost[] {
  const now = Date.now();
  const viewerLoc = viewerLocation?.trim().toLowerCase();
  return [...posts]
    .map((post) => {
      const ageHours = Math.max(0.5, (now - new Date(post.created_at).getTime()) / 3_600_000);
      const engagement = post.like_count * 3 + post.comment_count * 5;
      const velocity = engagement / (ageHours + 2);
      const freshnessBoost = ageHours < 72 ? (72 - ageHours) / 72 : 0;
      const regionalBoost = viewerLoc && post.author.location?.toLowerCase().includes(viewerLoc) ? 15 : 0;
      const score = velocity * 10 + freshnessBoost * 20 + regionalBoost;
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.post);
}

/**
 * Greedily reorders an already-ranked list so the same creator never appears
 * twice in a row when a different-author alternative is available, without
 * otherwise disturbing the relative order (best next pick each step).
 */
export function diversify(posts: FeedPost[]): FeedPost[] {
  const pool = [...posts];
  const result: FeedPost[] = [];
  let lastAuthorId: string | null = null;
  while (pool.length > 0) {
    let idx = pool.findIndex((p) => p.author.id !== lastAuthorId);
    if (idx === -1) idx = 0;
    const [next] = pool.splice(idx, 1);
    result.push(next);
    lastAuthorId = next.author.id;
  }
  return result;
}
