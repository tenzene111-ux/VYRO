import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, Bell, MessageCircle, Plus } from "lucide-react";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { currentUser, stories, byId } from "../data/mock";
import { PostCard } from "../components/PostCard";
import { posts as mockPosts } from "../data/mock";

const feedTabs = ["For You", "Following", "Friends", "Groups"];

export function Home() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("For You");

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
            <Avatar name={currentUser.name} size={32} />
          </button>
        </div>
      </header>

      {/* Stories */}
      <div className="no-scrollbar -mx-4 flex gap-3.5 overflow-x-auto px-4 pb-4">
        <button onClick={() => navigate("/create/story")} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full grad-primary glow-violet">
            <Plus className="h-6 w-6 text-white" />
          </span>
          <span className="text-[11px] text-mist">Your Story</span>
        </button>
        {stories.map((s) => {
          const user = byId(s.userId);
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/stories/${s.userId}`)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <Avatar name={user.name} size={54} ring={s.seen ? "story-seen" : "story"} />
              <span className="w-16 truncate text-center text-[11px] text-mist">{user.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Feed tabs */}
      <div className="no-scrollbar -mx-4 mb-1 flex gap-6 overflow-x-auto border-b border-white/5 px-4">
        {feedTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 pb-3 text-sm font-medium transition-colors ${
              tab === t ? "text-ink" : "text-mist"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full grad-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 py-4">
        {mockPosts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
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
