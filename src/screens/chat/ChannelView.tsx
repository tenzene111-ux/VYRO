import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Radio,
  MoreVertical,
  Heart,
  MessageCircle,
  Send,
  Image as ImageIcon,
  Pin,
  Trash2,
  Loader2,
  Crown,
  ShieldCheck,
  UserCog,
  X,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth, type Profile } from "../../context/AuthContext";
import { gradientFor } from "../../lib/gradients";
import { uploadImage } from "../../lib/storage";
import { supabase } from "../../lib/supabase";
import {
  getChannel,
  getMyChannelRole,
  listChannelPosts,
  createChannelPost,
  deleteChannelPost,
  pinChannelPost,
  unpinChannelPost,
  toggleChannelPostLike,
  listChannelPostComments,
  addChannelPostComment,
  listChannelSubscribers,
  promoteChannelAdmin,
  demoteChannelAdmin,
  joinChannel,
  leaveChannel,
  type Channel,
  type ChannelPost,
  type ChannelPostComment,
} from "../../lib/api";

export function ChannelView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [posts, setPosts] = useState<ChannelPost[] | null>(null);
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map());
  const [composerText, setComposerText] = useState("");
  const [composerImage, setComposerImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subscribersOpen, setSubscribersOpen] = useState(false);
  const [subscribers, setSubscribers] = useState<(Profile & { role: string })[] | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Map<string, ChannelPostComment[]>>(new Map());
  const [commentDraft, setCommentDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!id || !user) return;
    getChannel(id).then(setChannel);
    getMyChannelRole(id, user.id).then(setMyRole);
    listChannelPosts(id, user.id).then(async (p) => {
      setPosts(p);
      const authorIds = [...new Set(p.map((x) => x.author_id))];
      if (authorIds.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("id", authorIds);
        setAuthors(new Map((data ?? []).map((a) => [a.id, a])));
      }
    });
  };

  useEffect(load, [id, user]);

  const canPost = myRole === "owner" || myRole === "admin";
  const isSubscribed = !!myRole;
  const pinnedPost = posts?.find((p) => p.pinned && !p.deleted_at) ?? null;

  const handleSubscribe = async () => {
    if (!id) return;
    await joinChannel(id);
    load();
  };

  const handleLeave = async () => {
    if (!id) return;
    setMenuOpen(false);
    await leaveChannel(id);
    navigate("/chat/groups", { replace: true });
  };

  const handlePost = async () => {
    if (!id || !user || posting || (!composerText.trim() && !composerImage)) return;
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (composerImage) imageUrl = await uploadImage(user.id, composerImage);
      await createChannelPost(id, composerText.trim(), imageUrl);
      setComposerText("");
      setComposerImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (post: ChannelPost) => {
    if (!user) return;
    const nextLiked = !post.liked_by_me;
    setPosts((prev) =>
      prev
        ? prev.map((p) => (p.id === post.id ? { ...p, liked_by_me: nextLiked, like_count: p.like_count + (nextLiked ? 1 : -1) } : p))
        : prev
    );
    try {
      await toggleChannelPostLike(post.id, user.id, nextLiked);
    } catch {
      load();
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!commentsByPost.has(postId)) {
      const comments = await listChannelPostComments(postId);
      setCommentsByPost((prev) => new Map(prev).set(postId, comments));
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !commentDraft.trim()) return;
    const text = commentDraft.trim();
    setCommentDraft("");
    await addChannelPostComment(postId, user.id, text);
    const comments = await listChannelPostComments(postId);
    setCommentsByPost((prev) => new Map(prev).set(postId, comments));
    setPosts((prev) => (prev ? prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)) : prev));
  };

  const handlePin = async (post: ChannelPost) => {
    if (!id) return;
    setPosts((prev) => (prev ? prev.map((p) => ({ ...p, pinned: p.id === post.id })) : prev));
    try {
      await pinChannelPost(id, post.id);
    } catch {
      load();
    }
  };

  const handleUnpin = async (post: ChannelPost) => {
    setPosts((prev) => (prev ? prev.map((p) => (p.id === post.id ? { ...p, pinned: false } : p)) : prev));
    try {
      await unpinChannelPost(post.id);
    } catch {
      load();
    }
  };

  const handleDelete = async (post: ChannelPost) => {
    if (!window.confirm("Delete this post?")) return;
    setPosts((prev) => (prev ? prev.map((p) => (p.id === post.id ? { ...p, text: null, image_url: null, deleted_at: new Date().toISOString() } : p)) : prev));
    try {
      await deleteChannelPost(post.id);
    } catch {
      load();
    }
  };

  const handleOpenSubscribers = async () => {
    if (!id) return;
    setSubscribersOpen(true);
    setMenuOpen(false);
    if (!subscribers) setSubscribers(await listChannelSubscribers(id));
  };

  const handlePromote = async (target: Profile & { role: string }) => {
    if (!id) return;
    setSubscribers((prev) => (prev ? prev.map((s) => (s.id === target.id ? { ...s, role: "admin" } : s)) : prev));
    await promoteChannelAdmin(id, target.id).catch(() => {});
  };

  const handleDemote = async (target: Profile & { role: string }) => {
    if (!id) return;
    setSubscribers((prev) => (prev ? prev.map((s) => (s.id === target.id ? { ...s, role: "subscriber" } : s)) : prev));
    await demoteChannelAdmin(id, target.id).catch(() => {});
  };

  if (!channel) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-vyro-radial">
        <Loader2 className="h-5 w-5 animate-spin text-mist" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial">
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-3 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: gradientFor(channel.id) }}>
          <Radio className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{channel.name}</p>
          <p className="text-[11px] text-mist">{channel.subscriber_count.toLocaleString()} subscribers</p>
        </div>
        {!isSubscribed ? (
          <button onClick={handleSubscribe} className="shrink-0 rounded-full grad-purple-blue px-3.5 py-1.5 text-[12px] font-semibold text-white">
            Subscribe
          </button>
        ) : (
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="rounded-full p-2 text-mist hover:bg-white/5">
              <MoreVertical className="h-4.5 w-4.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-2xl glass-strong">
                <button
                  onClick={handleOpenSubscribers}
                  className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-[13px] font-medium text-ink hover:bg-white/5"
                >
                  <UserCog className="h-4 w-4" /> Subscribers
                </button>
                {myRole !== "owner" && (
                  <button
                    onClick={handleLeave}
                    className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-[13px] font-medium text-rose-400 hover:bg-white/5"
                  >
                    Unsubscribe
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {channel.description && <p className="border-b border-white/5 px-4 py-2.5 text-[12.5px] text-mist">{channel.description}</p>}

      {pinnedPost && (
        <button
          onClick={() => document.getElementById(`chpost-${pinnedPost.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-3.5 py-2 text-left"
        >
          <Pin className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-ink/80">{pinnedPost.text || "📷 Photo"}</span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {posts === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : posts.filter((p) => !p.deleted_at).length === 0 ? (
          <p className="py-16 text-center text-[13px] text-mist">No posts yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {posts
              .filter((p) => !p.deleted_at)
              .map((p) => {
                const author = authors.get(p.author_id);
                const comments = commentsByPost.get(p.id) ?? [];
                return (
                  <div key={p.id} id={`chpost-${p.id}`} className="overflow-hidden rounded-3xl glass-card">
                    <div className="flex items-center gap-2.5 px-3.5 pt-3">
                      <Avatar name={author?.name ?? channel.name} avatarUrl={author?.avatar_url} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-ink">{author?.name ?? channel.name}</p>
                        <p className="text-[10.5px] text-mist">{new Date(p.created_at).toLocaleString()}</p>
                      </div>
                      {p.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}
                      {canPost && (
                        <div className="flex shrink-0 items-center gap-1">
                          {p.pinned ? (
                            <button onClick={() => handleUnpin(p)} className="rounded-full p-1.5 text-mist hover:bg-white/5">
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handlePin(p)} className="rounded-full p-1.5 text-mist hover:bg-white/5">
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(p)} className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-rose-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {p.text && <p className="whitespace-pre-line px-3.5 pt-2.5 text-[13.5px] leading-relaxed text-ink">{p.text}</p>}
                    {p.image_url && <img src={p.image_url} alt="" className="mt-2.5 max-h-[360px] w-full object-cover" />}

                    <div className="flex items-center gap-4 px-3.5 py-3">
                      <button onClick={() => handleToggleLike(p)} className="flex items-center gap-1.5 text-[12.5px] text-mist">
                        <Heart className={`h-4 w-4 ${p.liked_by_me ? "fill-rose-400 text-rose-400" : ""}`} />
                        {p.like_count > 0 && p.like_count}
                      </button>
                      <button onClick={() => handleToggleComments(p.id)} className="flex items-center gap-1.5 text-[12.5px] text-mist">
                        <MessageCircle className="h-4 w-4" />
                        {p.comment_count > 0 && p.comment_count}
                      </button>
                    </div>

                    {expandedPost === p.id && (
                      <div className="border-t border-white/5 px-3.5 py-3">
                        {comments.length === 0 ? (
                          <p className="py-2 text-center text-[12px] text-mist">No comments yet.</p>
                        ) : (
                          <div className="mb-2 flex flex-col gap-2.5">
                            {comments.map((c) => (
                              <div key={c.id} className="flex items-start gap-2">
                                <Avatar name={c.author.name} avatarUrl={c.author.avatar_url} size={26} />
                                <div className="min-w-0 flex-1 rounded-2xl chip px-3 py-1.5">
                                  <p className="text-[11px] font-semibold text-ink">{c.author.name}</p>
                                  <p className="text-[12.5px] text-ink/90">{c.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {isSubscribed && (
                          <div className="flex items-center gap-2">
                            <input
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddComment(p.id)}
                              placeholder="Add a comment…"
                              className="flex-1 rounded-full chip px-3.5 py-2 text-[12.5px] text-ink placeholder:text-mist focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddComment(p.id)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full grad-purple-blue text-white"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {canPost && (
        <div className="border-t border-white/5 p-3 safe-bottom">
          {composerImage && (
            <div className="mb-2 flex items-center gap-2 rounded-xl chip px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{composerImage.name}</span>
              <button onClick={() => setComposerImage(null)} className="text-mist hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setComposerImage(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full chip text-mist"
            >
              <ImageIcon className="h-4.5 w-4.5" />
            </button>
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="Broadcast to your subscribers…"
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-2xl chip px-3.5 py-2.5 text-sm text-ink placeholder:text-mist focus:outline-none"
            />
            <button
              onClick={handlePost}
              disabled={posting || (!composerText.trim() && !composerImage)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-purple-blue text-white disabled:opacity-50"
            >
              {posting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      )}

      {subscribersOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSubscribersOpen(false)} />
          <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-h-[60vh] max-w-[440px] overflow-y-auto rounded-3xl glass-strong p-3">
            <p className="mb-2 px-1.5 py-1 text-[13px] font-semibold text-ink">Subscribers</p>
            {subscribers === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-mist" />
              </div>
            ) : (
              subscribers.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                  <Avatar name={s.name} avatarUrl={s.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{s.name}</p>
                    <p className="truncate text-[11px] text-mist">@{s.username}</p>
                  </div>
                  {s.role === "owner" && (
                    <span className="flex items-center gap-1 rounded-full chip px-2.5 py-1 text-[10.5px] font-semibold text-amber-300">
                      <Crown className="h-3 w-3" /> Owner
                    </span>
                  )}
                  {s.role === "admin" && (
                    <span className="flex items-center gap-1 rounded-full chip px-2.5 py-1 text-[10.5px] font-semibold text-cyan-300">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </span>
                  )}
                  {myRole === "owner" && s.role !== "owner" && (
                    <button
                      onClick={() => (s.role === "admin" ? handleDemote(s) : handlePromote(s))}
                      className="shrink-0 rounded-full chip px-3 py-1.5 text-[11px] font-semibold text-ink"
                    >
                      {s.role === "admin" ? "Remove admin" : "Make admin"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
