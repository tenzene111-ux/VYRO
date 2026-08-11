import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, MessageSquare, Share2, MapPin, BadgeCheck, Heart, Send, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { addComment, listComments, toggleLike, type Comment, type FeedPost } from "../lib/api";

export function PostCard({ post }: { post: FeedPost }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const handleLike = async () => {
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

  const handleOpenComments = async () => {
    setCommentsOpen((o) => !o);
    if (!comments) {
      const list = await listComments(post.id);
      setComments(list);
    }
  };

  const handleSendComment = async () => {
    if (!user || !commentText.trim()) return;
    setPosting(true);
    try {
      await addComment(post.id, user.id, commentText.trim());
      const list = await listComments(post.id);
      setComments(list);
      setCommentCount(list.length);
      setCommentText("");
    } finally {
      setPosting(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl glass-card animate-rise">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(`/profile/${post.author.id}`)}>
          <Avatar name={post.author.name} size={40} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-ink">{post.author.name}</p>
            {post.author.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-mist">
            {timeAgo(post.created_at)}
            {post.author.location && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                {post.author.location}
              </>
            )}
          </p>
        </div>
        <button className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-ink">
          <MoreHorizontal className="h-4.5 w-4.5" />
        </button>
      </div>

      <p className="whitespace-pre-line px-4 pt-3 text-[13.5px] leading-relaxed text-ink/95">{post.text}</p>

      <div className="flex items-center justify-between px-4 pt-3 text-[12px] text-mist">
        <span>{likeCount > 0 && `${formatCount(likeCount)} ${likeCount === 1 ? "like" : "likes"}`}</span>
        <span>{commentCount > 0 && `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 border-t border-white/5 px-2 py-1">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium transition-colors ${
            liked ? "text-rose-400" : "text-mist hover:bg-white/5 hover:text-ink"
          }`}
        >
          <Heart className={`h-4.5 w-4.5 ${liked ? "fill-rose-400" : ""}`} />
          {liked ? "Liked" : "Like"}
        </button>
        <button
          onClick={handleOpenComments}
          className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium text-mist transition-colors hover:bg-white/5 hover:text-ink"
        >
          <MessageSquare className="h-4.5 w-4.5" />
          Comment
        </button>
        <button className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium text-mist transition-colors hover:bg-white/5 hover:text-ink">
          <Share2 className="h-4.5 w-4.5" />
          Share
        </button>
      </div>

      {commentsOpen && (
        <div className="border-t border-white/5 px-4 py-3">
          {comments === null ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-mist" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-2 text-center text-[12px] text-mist">No comments yet. Say something!</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar name={c.author.name} size={28} />
                  <div className="min-w-0 flex-1 rounded-2xl chip px-3 py-2">
                    <p className="text-[11px] font-semibold text-violet-300">{c.author.name}</p>
                    <p className="text-[12.5px] text-ink/90">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder="Add a comment…"
              className="flex-1 rounded-full chip px-4 py-2 text-[13px] text-ink placeholder:text-mist focus:outline-none"
            />
            <button
              onClick={handleSendComment}
              disabled={posting || !commentText.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full grad-primary text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
