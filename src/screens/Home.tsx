import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Bell, MessageCircle, Plus, Loader2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { listFeedPosts, type FeedPost } from "../lib/api";

export function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listFeedPosts(user.id).then(setPosts).catch(() => setPosts([]));
  }, [user]);

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
          <IconBtn onClick={() => navigate("/notifications")} dot>
            <Bell className="h-5 w-5" />
          </IconBtn>
          <button onClick={() => navigate("/profile")} className="ml-1">
            <Avatar name={profile?.name ?? "You"} size={32} />
          </button>
        </div>
      </header>

      <button
        onClick={() => navigate("/create/post")}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl glass-card px-4 py-3.5 text-left"
      >
        <Avatar name={profile?.name ?? "You"} size={34} />
        <span className="text-[13.5px] text-mist">What's on your mind?</span>
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full grad-primary">
          <Plus className="h-4 w-4 text-white" />
        </span>
      </button>

      {posts === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">Your feed is empty</p>
          <p className="max-w-[240px] text-[12.5px] text-mist">Be the first to share something with VYRO.</p>
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
