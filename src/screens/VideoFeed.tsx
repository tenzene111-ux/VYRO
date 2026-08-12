import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, MessageSquare, Share2, Send, Loader2, Volume2, VolumeX, Radio } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import {
  listVideoPosts,
  listComments,
  addComment,
  toggleLike,
  toggleFollow,
  isFollowing,
  listLiveNow,
  type FeedPost,
  type Comment,
  type LiveSessionWithHost,
} from "../lib/api";

export function VideoFeed() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSessionWithHost[]>([]);
  const [activeId, setActiveId] = useState<string | null>(postId ?? null);
  const [globalMuted, setGlobalMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    listVideoPosts(user.id).then(setPosts).catch(() => setPosts([]));
    listLiveNow(user.id).then(setLiveSessions).catch(() => setLiveSessions([]));
  }, [user]);

  useEffect(() => {
    if (!posts || !postId || scrolledRef.current || !containerRef.current) return;
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx >= 0) {
      const el = containerRef.current.children[idx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
      setActiveId(postId);
    }
    scrolledRef.current = true;
  }, [posts, postId]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={containerRef} className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll">
        {posts === null ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/60" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-[13px] text-white/70">No videos yet.</p>
          </div>
        ) : (
          posts.map((p) => (
            <VideoTile
              key={p.id}
              post={p}
              active={p.id === activeId}
              muted={globalMuted}
              onMutedChange={setGlobalMuted}
              onActive={() => setActiveId(p.id)}
            />
          ))
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 pt-3 safe-top">
        <div className="pointer-events-auto flex items-center px-3">
          <button onClick={() => navigate(-1)} className="rounded-full bg-black/35 p-2 text-white backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        {liveSessions.length > 0 && (
          <div className="no-scrollbar pointer-events-auto flex gap-3 overflow-x-auto px-3 pb-1">
            {liveSessions.map((s) => (
              <button key={s.id} onClick={() => navigate(`/live/${s.id}`)} className="flex shrink-0 flex-col items-center gap-1">
                <Avatar name={s.host.name} avatarUrl={s.host.avatar_url} size={48} ring="live" />
                <span className="flex items-center gap-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[8.5px] font-bold text-white">
                  <Radio className="h-2 w-2" /> LIVE
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoTile({
  post,
  active,
  muted,
  onMutedChange,
  onActive,
}: {
  post: FeedPost;
  active: boolean;
  muted: boolean;
  onMutedChange: (m: boolean) => void;
  onActive: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [following, setFollowingState] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const isOwn = user?.id === post.author.id;

  useEffect(() => {
    if (!user || isOwn) return;
    isFollowing(user.id, post.author.id).then(setFollowingState);
  }, [user, post.author.id, isOwn]);

  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) onActive();
      },
      { threshold: [0.6] }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);

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

  const handleFollow = async () => {
    if (!user) return;
    const next = !following;
    setFollowingState(next);
    await toggleFollow(user.id, post.author.id, !next).catch(() => setFollowingState(!next));
  };

  const handleOpenComments = async () => {
    setCommentsOpen((o) => !o);
    if (!comments) setComments(await listComments(post.id));
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

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/watch/${post.id}`;
    if (navigator.share) await navigator.share({ title: "VYRO", url }).catch(() => {});
    else await navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div ref={tileRef} className="relative h-full w-full snap-start snap-always">
      <video
        ref={videoRef}
        src={post.video_url ?? undefined}
        poster={post.cover_url ?? undefined}
        muted={muted}
        loop
        playsInline
        onClick={() => onMutedChange(!muted)}
        className="h-full w-full object-contain bg-black"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      <button
        onClick={() => onMutedChange(!muted)}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/35 p-2.5 text-white backdrop-blur"
      >
        {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
      </button>

      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <button onClick={() => navigate(`/profile/${post.author.id}`)} className="relative">
          <Avatar name={post.author.name} avatarUrl={post.author.avatar_url} size={46} ring={isOwn ? undefined : "story"} />
        </button>
        <button onClick={handleLike} className="flex flex-col items-center gap-1 text-white">
          <Heart className={`h-7 w-7 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
          <span className="text-[11px] font-semibold">{likeCount}</span>
        </button>
        {post.comments_enabled ? (
          <button onClick={handleOpenComments} className="flex flex-col items-center gap-1 text-white">
            <MessageSquare className="h-7 w-7" />
            <span className="text-[11px] font-semibold">{commentCount}</span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/40">
            <MessageSquare className="h-7 w-7" />
            <span className="text-[11px] font-semibold">Off</span>
          </div>
        )}
        <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white">
          <Share2 className="h-7 w-7" />
          <span className="text-[11px] font-semibold">Share</span>
        </button>
      </div>

      <div className="absolute inset-x-4 bottom-8 z-10 max-w-[75%]">
        <div className="mb-2 flex items-center gap-2">
          <button onClick={() => navigate(`/profile/${post.author.id}`)} className="text-[14px] font-semibold text-white">
            {post.author.name}
          </button>
          {!isOwn && (
            <button
              onClick={handleFollow}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                following ? "bg-white/15 text-white" : "grad-primary text-white"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
        {post.text && <p className="text-[13px] leading-snug text-white/90">{post.text}</p>}
      </div>

      {commentsOpen && (
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[55%] rounded-t-3xl bg-neutral-950 p-4 pb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Comments</p>
            <button onClick={() => setCommentsOpen(false)} className="text-[12px] text-white/60">
              Close
            </button>
          </div>
          <div className="mb-3 max-h-[30vh] space-y-2.5 overflow-y-auto">
            {comments === null ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-white/50" />
              </div>
            ) : comments.length === 0 ? (
              <p className="py-2 text-center text-[12px] text-white/50">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar name={c.author.name} size={26} />
                  <div className="min-w-0 flex-1 rounded-2xl bg-white/10 px-3 py-2">
                    <p className="text-[11px] font-semibold text-violet-300">{c.author.name}</p>
                    <p className="text-[12.5px] text-white/90">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder="Add a comment…"
              className="flex-1 rounded-full bg-white/10 px-4 py-2 text-[13px] text-white placeholder:text-white/40 outline-none"
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
    </div>
  );
}
