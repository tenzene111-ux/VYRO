import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, Share2, Plus, BadgeCheck, Music2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { toggleLike, type FeedPost } from "../lib/api";

export function ShortVideoCard({ post }: { post: FeedPost }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await toggleLike(post.id, user.id, liked);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  return (
    <button
      onClick={() => navigate(`/watch/${post.id}`)}
      className="relative block aspect-[4/5.4] w-full overflow-hidden rounded-3xl bg-black text-left"
    >
      {post.cover_url ? (
        <img src={post.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : post.video_url ? (
        <video src={post.video_url} className="absolute inset-0 h-full w-full object-cover" muted />
      ) : null}
      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />

      <div className="absolute right-3 bottom-4 flex flex-col items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${post.author.id}`);
          }}
          className="relative"
        >
          <Avatar name={post.author.name} avatarUrl={post.author.avatar_url} size={40} />
          <span className="absolute -bottom-1.5 left-1/2 flex h-4.5 w-4.5 -translate-x-1/2 items-center justify-center rounded-full grad-primary ring-2 ring-black">
            <Plus className="h-2.5 w-2.5 text-white" />
          </span>
        </button>

        <button onClick={handleLike} className="flex flex-col items-center gap-1 text-white">
          <Heart className={`h-6.5 w-6.5 drop-shadow ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
          <span className="text-[11px] font-semibold drop-shadow">{formatCount(likeCount)}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/watch/${post.id}`);
          }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <MessageSquare className="h-6.5 w-6.5 drop-shadow" />
          <span className="text-[11px] font-semibold drop-shadow">{formatCount(post.comment_count)}</span>
        </button>

        <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1 text-white">
          <Share2 className="h-6.5 w-6.5 drop-shadow" />
          <span className="text-[11px] font-semibold drop-shadow">Share</span>
        </button>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          <Music2 className="h-4 w-4 text-white" />
        </span>
      </div>

      <div className="absolute inset-x-4 bottom-4 right-16">
        <div className="flex items-center gap-1 text-[13.5px] font-semibold text-white drop-shadow">
          @{post.author.username}
          {post.author.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}
        </div>
        {post.text && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-white/90 drop-shadow">{post.text}</p>
        )}
        <p className="mt-1.5 truncate text-[11px] text-white/70">♫ Original Sound — {post.author.name}</p>
      </div>
    </button>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}
