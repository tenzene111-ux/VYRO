import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Bell, Plus, Clapperboard, MessageSquare, Pencil, ArrowUp, Hash } from "lucide-react";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { useAuth, type Profile } from "../context/AuthContext";
import {
  listFeedPosts,
  listActiveStories,
  listSeenStoryIds,
  listFollowing,
  listFollowingFeed,
  listMyWatchSignals,
  listPostTexts,
  listProfiles,
  listTrendingHashtags,
  toggleFollow,
  type FeedPost,
  type StoryWithAuthor,
  type TrendingHashtag,
} from "../lib/api";
import { buildInterestProfile, diversify, pickRisingCreators, rankForYou, rankTrending } from "../lib/ranking";

type Tab = "forYou" | "following" | "trending";
const TABS: { id: Tab; label: string }[] = [
  { id: "forYou", label: "For You" },
  { id: "following", label: "Following" },
  { id: "trending", label: "Trending" },
];

type FollowingMode = "latest" | "recommended";

export function Home() {
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();
  const [allPosts, setAllPosts] = useState<FeedPost[] | null>(null);
  const [followingPosts, setFollowingPosts] = useState<FeedPost[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("forYou");
  const [followingMode, setFollowingMode] = useState<FollowingMode>("latest");
  const [newFollowingCount, setNewFollowingCount] = useState(0);
  const [storyAuthors, setStoryAuthors] = useState<{ author: Profile; seen: boolean; previewImageUrl: string | null }[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [interestProfile, setInterestProfile] = useState<Record<string, number>>({});
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);

  useEffect(() => {
    if (!user) return;
    listFeedPosts(user.id).then(setAllPosts).catch(() => setAllPosts([]));
    listFollowing(user.id).then(setFollowingIds).catch(() => setFollowingIds(new Set()));
    listMyWatchSignals(user.id)
      .then(async (signals) => {
        const textById = await listPostTexts(signals.map((s) => s.post_id));
        setInterestProfile(buildInterestProfile(signals, textById));
      })
      .catch(() => setInterestProfile({}));
    listTrendingHashtags().then(setTrendingHashtags).catch(() => setTrendingHashtags([]));
    Promise.all([listActiveStories(), listSeenStoryIds(user.id)]).then(([stories, seenIds]) => {
      const byAuthor = new Map<string, { author: StoryWithAuthor["author"]; seen: boolean; previewImageUrl: string | null }>();
      for (const s of stories) {
        const existing = byAuthor.get(s.author.id);
        const seen = seenIds.has(s.id);
        // stories arrive newest-first, so the first one seen per author is
        // already their latest — that's the one whose photo should preview
        if (!existing) byAuthor.set(s.author.id, { author: s.author, seen, previewImageUrl: s.image_url });
        else byAuthor.set(s.author.id, { ...existing, seen: existing.seen && seen });
      }
      setStoryAuthors([...byAuthor.values()]);
    });
    Promise.all([listProfiles(user.id), listFollowing(user.id)]).then(([profiles, following]) => {
      setSuggested(profiles.filter((p) => !following.has(p.id)).slice(0, 8));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    listFollowingFeed(user.id, [...followingIds, user.id])
      .then(setFollowingPosts)
      .catch(() => setFollowingPosts([]));
  }, [user, followingIds]);

  useEffect(() => {
    if (!followingPosts || !user) return;
    const lastSeen = Number(localStorage.getItem(`vyro-following-seen-${user.id}`) ?? 0);
    const count = followingPosts.filter(
      (p) => p.author.id !== user.id && new Date(p.created_at).getTime() > lastSeen
    ).length;
    setNewFollowingCount(count);
  }, [followingPosts, user]);

  const handleFollowSuggested = async (targetId: string) => {
    if (!user) return;
    setSuggested((prev) => prev.filter((p) => p.id !== targetId));
    try {
      await toggleFollow(user.id, targetId, false);
    } catch {
      // leave it removed from the list; user can re-follow from Explore if this failed
    }
  };

  const handleFollowRising = async (targetId: string) => {
    if (!user) return;
    setFollowingIds((prev) => new Set(prev).add(targetId));
    try {
      await toggleFollow(user.id, targetId, false);
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const handleJumpToNewest = () => {
    if (!user) return;
    localStorage.setItem(`vyro-following-seen-${user.id}`, String(Date.now()));
    setNewFollowingCount(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tabFiltered =
    tab === "following"
      ? followingPosts === null
        ? null
        : followingMode === "latest"
        ? followingPosts
        : diversify(rankForYou(followingPosts, followingIds, user?.id ?? "", interestProfile))
      : allPosts === null
      ? null
      : tab === "forYou"
      ? diversify(rankForYou(allPosts, followingIds, user?.id ?? "", interestProfile))
      : rankTrending(allPosts, myProfile?.location);

  const risingCreators = tab === "trending" && allPosts ? pickRisingCreators(allPosts, followingIds, user?.id ?? "") : [];

  const videoPosts = tabFiltered?.filter((p) => p.video_url) ?? null;
  const posts = tabFiltered?.filter((p) => !p.video_url) ?? null;

  const handleOpenShortVideos = () => {
    if (videoPosts && videoPosts.length > 0) navigate(`/watch/${videoPosts[0].id}`);
  };

  return (
    <div className="px-4">
      <header className="flex items-center justify-between py-4 safe-top">
        <Logo size={22} />
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => navigate("/explore")}>
            <Search className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={() => navigate("/notifications")} dot>
            <Bell className="h-5 w-5" />
          </IconBtn>
        </div>
      </header>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-3.5 overflow-x-auto px-4">
        <button onClick={() => navigate("/create/story")} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full grad-primary glow-violet">
            <Plus className="h-6 w-6 text-white" />
          </span>
          <span className="text-[11px] text-mist">Your Story</span>
        </button>
        {storyAuthors.map(({ author, seen, previewImageUrl }) => (
          <button
            key={author.id}
            onClick={() => navigate(`/stories/${author.id}`)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <Avatar
              name={author.name}
              avatarUrl={previewImageUrl ?? author.avatar_url}
              size={54}
              ring={seen ? "story-seen" : "story"}
            />
            <span className="w-16 truncate text-center text-[11px] text-mist">{author.name.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {suggested.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[12.5px] font-semibold text-mist">People you may know</p>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {suggested.map((p) => (
            <div key={p.id} className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl glass-card p-3 text-center">
              <button onClick={() => navigate(`/profile/${p.id}`)} className="flex flex-col items-center gap-1.5">
                <Avatar name={p.name} avatarUrl={p.avatar_url} size={48} />
                <span className="w-full truncate text-[11.5px] font-semibold text-ink">{p.name.split(" ")[0]}</span>
                <span className="w-full truncate text-[10px] text-mist">@{p.username}</span>
              </button>
              <button
                onClick={() => handleFollowSuggested(p.id)}
                className="mt-0.5 w-full rounded-full grad-purple-blue py-1 text-[11px] font-semibold text-white"
              >
                Follow
              </button>
            </div>
            ))}
          </div>
        </div>
      )}

      <div className="no-scrollbar -mx-4 mb-4 flex gap-5 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 pb-1 text-[14px] font-semibold transition-colors ${
              tab === t.id ? "text-ink" : "text-mist"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "following" && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex gap-1.5 rounded-full chip p-1">
            {(["latest", "recommended"] as FollowingMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setFollowingMode(m)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                  followingMode === m ? "grad-purple-blue text-white" : "text-mist"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {newFollowingCount > 0 && (
            <button
              onClick={handleJumpToNewest}
              className="flex items-center gap-1.5 rounded-full chip px-3 py-1.5 text-[12px] font-semibold text-cyan-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {newFollowingCount} new
              <ArrowUp className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {tab === "trending" && (trendingHashtags.length > 0 || risingCreators.length > 0) && (
        <div className="mb-5 flex flex-col gap-4">
          {trendingHashtags.length > 0 && (
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-mist">🔥 Trending hashtags</p>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {trendingHashtags.map((h) => (
                  <button
                    key={h.tag}
                    onClick={() => navigate(`/explore?q=${encodeURIComponent(h.tag)}`)}
                    className="flex shrink-0 items-center gap-1 rounded-full chip px-3.5 py-1.5 text-[12.5px] font-semibold text-ink"
                  >
                    <Hash className="h-3 w-3 text-cyan-300" />
                    {h.tag.replace(/^#/, "")}
                    <span className="text-mist">· {h.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {risingCreators.length > 0 && (
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-mist">🚀 Rising creators</p>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
                {risingCreators.map((c) => (
                  <div key={c.id} className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl glass-card p-3 text-center">
                    <button onClick={() => navigate(`/profile/${c.id}`)} className="flex flex-col items-center gap-1.5">
                      <Avatar name={c.name} avatarUrl={c.avatar_url} size={48} />
                      <span className="w-full truncate text-[11.5px] font-semibold text-ink">{c.name.split(" ")[0]}</span>
                    </button>
                    <button
                      onClick={() => handleFollowRising(c.id)}
                      className="mt-0.5 w-full rounded-full grad-purple-blue py-1 text-[11px] font-semibold text-white"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex gap-1.5 rounded-full chip p-1">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full grad-primary py-2 text-[12.5px] font-semibold text-white">
          <MessageSquare className="h-3.5 w-3.5" />
          Posts
        </button>
        <button
          onClick={handleOpenShortVideos}
          disabled={!videoPosts || videoPosts.length === 0}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12.5px] font-semibold text-mist transition-colors disabled:opacity-40"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          Short Videos
        </button>
      </div>

      <div className="relative">
        {posts === null ? (
          <div className="-mx-4 flex flex-col">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="font-display text-sm font-semibold text-ink">
              {tab === "following" ? "Follow people to see their posts here" : "Your feed is empty"}
            </p>
            <p className="max-w-[240px] text-[12.5px] text-mist">
              {tab === "following" ? "Explore to find creators worth following." : "Be the first to share something with VYRO."}
            </p>
          </div>
        ) : (
          <div className="-mx-4 flex flex-col pb-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}

        <button
          onClick={() => navigate("/create/post")}
          className="fixed bottom-24 right-4 z-30 mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full grad-primary text-white shadow-lg glow-violet active:scale-95 transition-transform"
          style={{ right: "max(1rem, calc((100vw - 480px) / 2 + 1rem))" }}
          aria-label="New post"
        >
          <Pencil className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, dot }: { children: React.ReactNode; onClick?: () => void; dot?: boolean }) {
  return (
    <button onClick={onClick} className="relative rounded-full p-2 text-ink/80 transition-colors hover:bg-white/5 hover:text-ink">
      {children}
      {dot && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-magenta ring-2 ring-void" />}
    </button>
  );
}

function PostSkeleton() {
  return (
    <div className="animate-pulse border-b-8 border-void-2 px-4 pb-4 pt-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded-full bg-white/5" />
          <div className="h-2.5 w-20 rounded-full bg-white/5" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-full rounded-full bg-white/5" />
        <div className="h-3 w-3/4 rounded-full bg-white/5" />
      </div>
      <div className="mt-3 h-52 w-full rounded-2xl bg-white/5" />
      <div className="mt-3 flex gap-4">
        <div className="h-4 w-10 rounded-full bg-white/5" />
        <div className="h-4 w-10 rounded-full bg-white/5" />
        <div className="h-4 w-10 rounded-full bg-white/5" />
      </div>
    </div>
  );
}
