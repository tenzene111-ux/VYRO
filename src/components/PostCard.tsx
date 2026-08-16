import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, MessageSquare, Share2, MapPin, BadgeCheck, ThumbsUp, Send, Loader2, Play, Bookmark, X, Check } from "lucide-react";
import { Avatar } from "./Avatar";
import { ReportModal } from "./ReportModal";
import { useAuth } from "../context/AuthContext";
import {
  addComment,
  deleteComment,
  deletePost,
  listComments,
  setCommentReaction,
  setPostReaction,
  toggleSavePost,
  updatePost,
  type Comment,
  type FeedPost,
  type ReactionType,
} from "../lib/api";

const REACTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: "like", emoji: "👍", label: "Like", color: "text-sky-400" },
  { type: "love", emoji: "❤️", label: "Love", color: "text-rose-400" },
  { type: "haha", emoji: "😆", label: "Haha", color: "text-amber-400" },
  { type: "wow", emoji: "😮", label: "Wow", color: "text-amber-400" },
  { type: "sad", emoji: "😢", label: "Sad", color: "text-amber-400" },
  { type: "angry", emoji: "😡", label: "Angry", color: "text-orange-500" },
];

function reactionMeta(type: ReactionType | null) {
  return REACTIONS.find((r) => r.type === type) ?? null;
}

export function PostCard({ post }: { post: FeedPost }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.id === post.author.id;
  const [myReaction, setMyReaction] = useState<ReactionType | null>(post.my_reaction);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [saved, setSaved] = useState(post.saved_by_me);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [text, setText] = useState(post.text);
  const [editedAt, setEditedAt] = useState(post.edited_at);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleReact = async (next: ReactionType | null) => {
    if (!user) return;
    const prev = myReaction;
    if (prev === next) return;
    setMyReaction(next);
    setLikeCount((c) => c + (next ? 1 : 0) - (prev ? 1 : 0));
    try {
      await setPostReaction(post.id, user.id, next);
    } catch {
      setMyReaction(prev);
      setLikeCount((c) => c + (prev ? 1 : 0) - (next ? 1 : 0));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    try {
      await toggleSavePost(user.id, post.id, saved);
    } catch {
      setSaved(!next);
    }
  };

  const handleOpenComments = async () => {
    setCommentsOpen((o) => !o);
    if (!comments) {
      const list = await listComments(post.id, user?.id);
      setComments(list);
    }
  };

  const handleSendComment = async () => {
    if (!user || !commentText.trim()) return;
    setPosting(true);
    try {
      await addComment(post.id, user.id, commentText.trim(), replyingTo?.id);
      const list = await listComments(post.id, user.id);
      setComments(list);
      setCommentCount(countComments(list));
      setCommentText("");
      setReplyingTo(null);
    } finally {
      setPosting(false);
    }
  };

  const handleCommentReact = async (comment: Comment, next: ReactionType | null) => {
    if (!user) return;
    const prev = comment.my_reaction;
    if (prev === next) return;
    setComments((cur) =>
      cur ? updateCommentTree(cur, comment.id, (c) => ({ ...c, my_reaction: next, like_count: c.like_count + (next ? 1 : 0) - (prev ? 1 : 0) })) : cur
    );
    try {
      await setCommentReaction(comment.id, user.id, next);
    } catch {
      setComments((cur) =>
        cur ? updateCommentTree(cur, comment.id, (c) => ({ ...c, my_reaction: prev, like_count: c.like_count + (prev ? 1 : 0) - (next ? 1 : 0) })) : cur
      );
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(comment.id);
      setComments((cur) => {
        if (!cur) return cur;
        const next = removeCommentFromTree(cur, comment.id);
        setCommentCount(countComments(next));
        return next;
      });
    } catch {
      // leave the comment in place if the delete failed
    }
  };

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || savingEdit) return;
    setSavingEdit(true);
    try {
      await updatePost(post.id, trimmed);
      setText(trimmed);
      setEditedAt(new Date().toISOString());
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    setMenuOpen(false);
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      await deletePost(post.id);
      setDeleted(true);
    } catch {
      // leave the post in place if the delete failed
    }
  };

  if (deleted) return null;

  return (
    <article className="border-b-8 border-void-2 pb-3 animate-rise">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(`/profile/${post.author.id}`)}>
          <Avatar name={post.author.name} avatarUrl={post.author.avatar_url} size={40} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-ink">{post.author.name}</p>
            {post.author.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-mist">
            {timeAgo(post.created_at)}
            {editedAt && <span>· edited</span>}
            {post.author.location && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                {post.author.location}
              </>
            )}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-ink"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-2xl glass-strong py-1">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditText(text);
                        setEditing(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-ink hover:bg-white/5"
                    >
                      Edit post
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-rose-400 hover:bg-white/5"
                    >
                      Delete post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-rose-400 hover:bg-white/5"
                  >
                    Report post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="px-4 pt-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-2xl chip px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-mist hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit || !editText.trim()}
              className="flex items-center gap-1.5 rounded-full grad-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
            >
              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        text && <p className="whitespace-pre-line px-4 pt-3 text-[13.5px] leading-relaxed text-ink/95">{text}</p>
      )}

      {post.video_url && (
        <button
          onClick={() => navigate(`/watch/${post.id}`)}
          className="relative mt-3 flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-black"
        >
          {post.cover_url ? (
            <img src={post.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <video src={post.video_url} className="absolute inset-0 h-full w-full object-cover" muted />
          )}
          <span className="absolute inset-0 bg-black/15" />
          <span className="relative rounded-full bg-black/45 p-3.5 backdrop-blur">
            <Play className="h-6 w-6 text-white" />
          </span>
          {post.video_duration_seconds != null && (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">
              {formatVideoDuration(post.video_duration_seconds)}
            </span>
          )}
        </button>
      )}

      {!post.video_url && post.image_url && (
        <div className="mt-3">
          <img src={post.image_url} alt="" className="max-h-[480px] w-full object-cover" />
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 px-4 text-[12.5px] font-medium text-mist">
        <ReactButton reaction={myReaction} count={likeCount} size="post" onChange={handleReact} />
        {post.comments_enabled && (
          <button onClick={handleOpenComments} className="flex items-center gap-1.5 hover:text-ink">
            <MessageSquare className="h-5 w-5" />
            {commentCount > 0 && formatCount(commentCount)}
          </button>
        )}
        <button className="flex items-center gap-1.5 hover:text-ink">
          <Share2 className="h-5 w-5" />
        </button>
        <button onClick={handleSave} className={`ml-auto ${saved ? "text-cyan-300" : "hover:text-ink"}`}>
          <Bookmark className={`h-5 w-5 ${saved ? "fill-cyan-300" : ""}`} />
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
            <div className="no-scrollbar max-h-72 space-y-3 overflow-y-auto pr-0.5">
              {comments.map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  depth={0}
                  currentUserId={user?.id}
                  onReact={handleCommentReact}
                  onReply={setReplyingTo}
                  onDelete={handleDeleteComment}
                />
              ))}
            </div>
          )}

          {replyingTo && (
            <div className="mt-2.5 flex items-center justify-between rounded-full chip px-3.5 py-1.5 text-[12px] text-mist">
              <span>
                Replying to <span className="font-semibold text-ink">{replyingTo.name}</span>
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-mist hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : "Add a comment…"}
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

      {reportOpen && <ReportModal targetType="post" targetId={post.id} onClose={() => setReportOpen(false)} />}
    </article>
  );
}

function ReactButton({
  reaction,
  count,
  size,
  onChange,
}: {
  reaction: ReactionType | null;
  count: number;
  size: "post" | "comment";
  onChange: (next: ReactionType | null) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const startPress = () => {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setPickerOpen(true);
    }, 400);
  };
  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const endPress = () => {
    cancelPress();
    if (!longPressedRef.current) onChange(reaction ? null : "like");
  };

  const meta = reactionMeta(reaction);
  const pickerEmojiSize = size === "post" ? "text-2xl" : "text-lg";
  const pickerBtnSize = size === "post" ? "h-10 w-10" : "h-8 w-8";

  return (
    <div className="relative">
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} onPointerDown={() => setPickerOpen(false)} />
          <div className="absolute bottom-full left-0 z-40 mb-2 flex items-center gap-0.5 rounded-full glass-strong px-2 py-1.5 shadow-lg">
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                onClick={() => {
                  onChange(reaction === r.type ? null : r.type);
                  setPickerOpen(false);
                }}
                title={r.label}
                className={`flex ${pickerBtnSize} items-center justify-center rounded-full ${pickerEmojiSize} leading-none transition-transform hover:scale-125`}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        className={`flex select-none items-center gap-1.5 ${
          size === "post" ? "text-[12.5px]" : "text-[11px]"
        } font-medium ${meta ? meta.color : "text-mist hover:text-ink"}`}
      >
        {meta ? (
          <span className={size === "post" ? "text-[18px] leading-none" : "text-[13px] leading-none"}>{meta.emoji}</span>
        ) : (
          <ThumbsUp className={size === "post" ? "h-5 w-5" : "h-3 w-3"} />
        )}
        {count > 0 && formatCount(count)}
      </button>
    </div>
  );
}

function CommentRow({
  comment,
  depth,
  currentUserId,
  onReact,
  onReply,
  onDelete,
}: {
  comment: Comment;
  depth: number;
  currentUserId: string | undefined;
  onReact: (c: Comment, next: ReactionType | null) => void;
  onReply: (target: { id: string; name: string }) => void;
  onDelete: (c: Comment) => void;
}) {
  return (
    <div className={depth > 0 ? "ml-9" : ""}>
      <div className="flex items-start gap-2.5">
        <Avatar name={comment.author.name} size={depth > 0 ? 24 : 28} />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl chip px-3 py-2">
            <p className="text-[11px] font-semibold text-violet-300">{comment.author.name}</p>
            <p className="text-[12.5px] text-ink/90">{comment.text}</p>
          </div>
          <div className="mt-1 flex items-center gap-3 px-1 text-[11px] font-medium text-mist">
            <span>{timeAgo(comment.created_at)}</span>
            <ReactButton reaction={comment.my_reaction} count={comment.like_count} size="comment" onChange={(next) => onReact(comment, next)} />
            <button onClick={() => onReply({ id: comment.id, name: comment.author.name })} className="hover:text-ink">
              Reply
            </button>
            {currentUserId === comment.author.id && (
              <button onClick={() => onDelete(comment)} className="hover:text-rose-400">
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {comment.replies.length > 0 && (
        <div className="mt-2.5 space-y-2.5">
          {comment.replies.map((r) => (
            <CommentRow key={r.id} comment={r} depth={depth + 1} currentUserId={currentUserId} onReact={onReact} onReply={onReply} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function countComments(list: Comment[]): number {
  return list.reduce((sum, c) => sum + 1 + countComments(c.replies), 0);
}

function updateCommentTree(list: Comment[], id: string, updater: (c: Comment) => Comment): Comment[] {
  return list.map((c) => {
    if (c.id === id) return updater(c);
    if (c.replies.length > 0) return { ...c, replies: updateCommentTree(c.replies, id, updater) };
    return c;
  });
}

function removeCommentFromTree(list: Comment[], id: string): Comment[] {
  return list.filter((c) => c.id !== id).map((c) => ({ ...c, replies: removeCommentFromTree(c.replies, id) }));
}

function formatVideoDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
