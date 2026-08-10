import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, MessageSquare, Share2, Send, MapPin, BadgeCheck, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar } from "./Avatar";
import { byId, type Post } from "../data/mock";
import { gradientFor } from "../lib/gradients";

const reactionSet = ["❤️", "🔥", "😂", "😮", "😢", "👏"];

export function PostCard({ post }: { post: Post }) {
  const user = byId(post.userId);
  const navigate = useNavigate();
  const [liked, setLiked] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const startPress = () => {
    pressTimer.current = window.setTimeout(() => setShowPicker(true), 380);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (!showPicker) setLiked((l) => (l ? null : "❤️"));
  };

  return (
    <article className="overflow-hidden rounded-3xl glass-card animate-rise">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(`/profile/${user.id}`)}>
          <Avatar name={user.name} size={40} online={user.online} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            {user.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-mist">
            {post.time} ago
            {post.location && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                {post.location}
              </>
            )}
          </p>
        </div>
        <button className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-ink">
          <MoreHorizontal className="h-4.5 w-4.5" />
        </button>
      </div>

      <p className="whitespace-pre-line px-4 pt-3 text-[13.5px] leading-relaxed text-ink/95">{post.text}</p>

      {post.hasMedia && (
        <div
          className="relative mx-4 mt-3 aspect-[4/5] overflow-hidden rounded-2xl"
          style={{ background: gradientFor(post.id) }}
        >
          {post.mediaCount && post.mediaCount > 1 && (
            <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              1/{post.mediaCount}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 pt-3 text-[12px] text-mist">
        <span className="flex items-center gap-1">
          <span className="flex -space-x-1.5">
            {post.reactions.map((r, i) => (
              <span key={i} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[11px] ring-2 ring-void">
                {r}
              </span>
            ))}
          </span>
          {formatCount(post.likes)}
        </span>
        <span className="flex gap-3">
          <span>{post.comments} Comments</span>
          <span>{post.shares} Shares</span>
        </span>
      </div>

      <div className="relative mt-2 grid grid-cols-4 gap-1 border-t border-white/5 px-2 py-1">
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                className="absolute bottom-full z-20 mb-2 flex gap-1 rounded-full glass-strong p-1.5 glow-violet"
                onMouseLeave={() => setShowPicker(false)}
              >
                {reactionSet.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setLiked(r);
                      setShowPicker(false);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 active:scale-95"
                  >
                    {r}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onMouseDown={startPress}
            onMouseUp={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium transition-colors ${
              liked ? "text-magenta-400" : "text-mist hover:bg-white/5 hover:text-ink"
            }`}
          >
            {liked ? <span className="text-base leading-none">{liked}</span> : <Heart className="h-4.5 w-4.5" />}
            {liked ? "Liked" : "Like"}
          </button>
        </div>
        <ActionBtn icon={MessageSquare} label="Comment" />
        <ActionBtn icon={Share2} label="Share" />
        <ActionBtn icon={Send} label="Send" />
      </div>
    </article>
  );
}

function ActionBtn({ icon: Icon, label }: { icon: typeof MessageSquare; label: string }) {
  return (
    <button className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium text-mist transition-colors hover:bg-white/5 hover:text-ink">
      <Icon className="h-4.5 w-4.5" />
      {label}
    </button>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}
