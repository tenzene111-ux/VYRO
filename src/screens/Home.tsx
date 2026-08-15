import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, MessageCircle, Plus, Loader2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { useAuth, type Profile } from "../context/AuthContext";
import { listFeedPosts, listActiveStories, listSeenStoryIds, listFollowing, type FeedPost, type StoryWithAuthor } from "../lib/api";
import { rankForYou, filterFollowing } from "../lib/ranking";

export function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [allPosts, setAllPosts] = useState<FeedPost[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"forYou" | "following">("forYou");
  const [storyAuthors, setStoryAuthors] = useState<{ author: Profile; seen: boolean }[]>([]);

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
  }, [user]);

  const posts =
    allPosts === null
      ? null
      : tab === "forYou"
      ? rankForYou(allPosts, followingIds, user?.id ?? "")
      : filterFollowing(allPosts, followingIds, user?.id ?? "");

  return (
    <div className="px-4">
      <header className="flex items-center justify-between py-4 safe-top">
        <Logo size={22} />
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => navigate("/explore")}>
            <Search className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={() => navigate("/chat")}>
            <MessageCircle className="h-5 w-5" />
          </IconBtn>
          <button onClick={() => navigate("/profile")} className="ml-1">
            <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={32} />
          </button>
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

      <button
        onClick={() => navigate("/create/post")}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl glass-card px-4 py-3.5 text-left"
      >
        <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={34} />
        <span className="text-[13.5px] text-mist">What's on your mind?</span>
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full grad-primary">
          <Plus className="h-4 w-4 text-white" />
        </span>
      </button>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("forYou")}
          className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
            tab === "forYou" ? "grad-primary text-white" : "chip text-mist"
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setTab("following")}
          className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
            tab === "following" ? "grad-primary text-white" : "chip text-mist"
          }`}
        >
          Following
        </button>
      </div>

      {posts === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
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
        <div className="flex flex-col gap-4 pb-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
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
