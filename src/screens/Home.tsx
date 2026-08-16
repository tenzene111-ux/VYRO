import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Bell, Plus, Clapperboard, MessageSquare, Pencil } from "lucide-react";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { useAuth, type Profile } from "../context/AuthContext";
import {
  listFeedPosts,
  listActiveStories,
  listSeenStoryIds,
  listFollowing,
  listProfiles,
  toggleFollow,
  type FeedPost,
  type StoryWithAuthor,
} from "../lib/api";
import { rankForYou, filterFollowing } from "../lib/ranking";

type Tab = "forYou" | "following" | "trending";
const TABS: { id: Tab; label: string }[] = [
  { id: "forYou", label: "For You" },
  { id: "following", label: "Following" },
  { id: "trending", label: "Trending" },
];

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<FeedPost[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("forYou");
  const [storyAuthors, setStoryAuthors] = useState<{ author: Profile; seen: boolean }[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);

  useEffect(() => {
    if (!user) return;
    listFeedPosts(user.id).then(setAllPosts).catch(() => setAllPosts([]));
    listFollowing(user.id).then(setFollowingIds).catch(() => setFollowingIds(new Set()));
    Promise.all([listActiveStories(), listSeenStoryIds(user.id)]).then(([stories, seenIds]) => {
      const byAuthor = new Map<string, { author: StoryWithAuthor["author"]; seen: boolean }>();
      for (const s of stories) {
        const existing = byAuthor.get(s.author.id);
        const seen = seenIds.has(s.id);
        if (!existing) byAuthor.set(s.author.id, { author: s.author, seen });
        else byAuthor.set(s.author.id, { author: s.author, seen: existing.seen && seen });
      }
      setStoryAuthors([...byAuthor.values()]);
    });
    Promise.all([listProfiles(user.id), listFollowing(user.id)]).then(([profiles, following]) => {
      setSuggested(profiles.filter((p) => !following.has(p.id)).slice(0, 8));
    });
  }, [user]);

  const handleFollowSuggested = async (targetId: string) => {
    if (!user) return;
    setSuggested((prev) => prev.filter((p) => p.id !== targetId));
    try {
      await toggleFollow(user.id, targetId, false);
    } catch {
      // leave it removed from the list; user can re-follow from Explore if this failed
    }
  };

  const tabFiltered =
    allPosts === null
      ? null
      : tab === "forYou"
      ? rankForYou(allPosts, followingIds, user?.id ?? "")
      : tab === "following"
      ? filterFollowing(allPosts, followingIds, user?.id ?? "")
      : [...allPosts].sort((a, b) => b.like_count + b.comment_count - (a.like_count + a.comment_count));

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
        {storyAuthors.map(({ author, seen }) => (
          <button
            key={author.id}
            onClick={() => navigate(`/stories/${author.id}`)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <Avatar name={author.name} avatarUrl={author.avatar_url} size={54} ring={seen ? "story-seen" : "story"} />
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
