import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users2, Loader2, Send } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { gradientFor } from "../lib/gradients";
import { useAuth, type Profile } from "../context/AuthContext";
import {
  getCommunity, joinCommunity, leaveCommunity, listCommunityMembers, listCommunityPosts, createCommunityPost,
  type Community, type FeedPost,
} from "../lib/api";

export function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [tab, setTab] = useState<"posts" | "members">("posts");
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [members, setMembers] = useState<(Profile & { role: string })[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = () => {
    if (!id || !user) return;
    getCommunity(id, user.id).then(setCommunity);
    listCommunityPosts(id, user.id).then(setPosts);
  };

  useEffect(load, [id, user]);

  useEffect(() => {
    if (tab === "members" && id && members === null) listCommunityMembers(id).then(setMembers);
  }, [tab, id, members]);

  const handleToggleJoin = async () => {
    if (!id || !community) return;
    setBusy(true);
    try {
      if (community.my_role) await leaveCommunity(id);
      else await joinCommunity(id);
      load();
    } finally {
      setBusy(false);
    }
  };

  const handlePost = async () => {
    if (!id || !user || !composerText.trim()) return;
    setPosting(true);
    try {
      await createCommunityPost(id, user.id, composerText.trim());
      setComposerText("");
      listCommunityPosts(id, user.id).then(setPosts);
    } finally {
      setPosting(false);
    }
  };

  if (!community) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-vyro-radial">
        <Loader2 className="h-5 w-5 animate-spin text-mist" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-vyro-radial safe-top">
      <div className="relative h-36" style={community.cover_url ? {} : { background: gradientFor(community.id) }}>
        {community.cover_url && <img src={community.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute inset-0 bg-black/25" />
        <button onClick={() => navigate(-1)} className="absolute left-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="px-4">
        <div className="-mt-8 mb-3 flex items-end justify-between">
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl grad-purple-blue ring-4 ring-void">
            {community.logo_url ? (
              <img src={community.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Users2 className="h-7 w-7 text-white" />
            )}
          </span>
          <button
            onClick={handleToggleJoin}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              community.my_role ? "chip text-ink" : "grad-primary text-white glow-violet"
            }`}
          >
            {community.my_role ? "Joined ✓" : "Join"}
          </button>
        </div>

        <p className="font-display text-lg font-bold text-ink">{community.name}</p>
        <p className="text-[12px] text-mist">
          {community.member_count} {community.member_count === 1 ? "member" : "members"}
          {community.category && ` · ${community.category}`}
        </p>
        {community.description && <p className="mt-2 text-[13px] leading-relaxed text-ink/90">{community.description}</p>}

        <div className="mb-4 mt-4 flex gap-2">
          <button
            onClick={() => setTab("posts")}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              tab === "posts" ? "grad-primary text-white" : "chip text-mist"
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setTab("members")}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              tab === "members" ? "grad-primary text-white" : "chip text-mist"
            }`}
          >
            Members
          </button>
        </div>

        {tab === "posts" ? (
          <>
            {community.my_role && (
              <div className="mb-4 flex items-center gap-2.5 rounded-2xl glass-card p-3">
                <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={32} />
                <input
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePost()}
                  placeholder={`Post in ${community.name}…`}
                  className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-mist focus:outline-none"
                />
                <button
                  onClick={handlePost}
                  disabled={posting || !composerText.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full grad-primary text-white disabled:opacity-50"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}

            {posts === null ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-mist" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="font-display text-sm font-semibold text-ink">No posts yet</p>
                <p className="max-w-[240px] text-[12.5px] text-mist">Be the first to share something here.</p>
              </div>
            ) : (
              <div className="-mx-4 flex flex-col pb-8">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </>
        ) : members === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-8">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/profile/${m.id}`)}
                className="flex items-center gap-3 rounded-2xl glass-card p-3 text-left"
              >
                <Avatar name={m.name} avatarUrl={m.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{m.name}</p>
                  <p className="text-[11px] text-mist">@{m.username}</p>
                </div>
                {m.role !== "member" && (
                  <span className="shrink-0 rounded-full chip px-2.5 py-1 text-[10px] font-semibold uppercase text-violet-300">
                    {m.role}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
