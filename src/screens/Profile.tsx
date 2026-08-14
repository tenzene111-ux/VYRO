import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Pencil, Grid3x3, Clapperboard, Bookmark, Repeat2, BadgeCheck, MessageCircle, X, Check, Gift, Camera, Loader2,
} from "lucide-react";
import { Avatar } from "../components/Avatar";
import { GiftPicker } from "../components/GiftPicker";
import { useAuth, type Profile as ProfileRow } from "../context/AuthContext";
import { gradientFor } from "../lib/gradients";
import {
  countFollowers, countFollowing, countPosts, getOrCreateConversationWith, getProfile, isFollowing,
  listPostsByAuthor, listSavedPosts, toggleFollow, updateProfile, type SimplePost, type FeedPost,
} from "../lib/api";
import { uploadImage } from "../lib/storage";

const tabs = [
  { id: "posts", icon: Grid3x3 },
  { id: "videos", icon: Clapperboard },
  { id: "saved", icon: Bookmark },
  { id: "reposts", icon: Repeat2 },
];

type ThumbPost = { id: string; text: string; image_url: string | null; video_url: string | null; cover_url: string | null };

function PostThumb({ p }: { p: ThumbPost }) {
  if (p.video_url) {
    return (
      <div className="relative aspect-square overflow-hidden bg-black">
        {p.cover_url ? (
          <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <video src={p.video_url} className="h-full w-full object-cover" muted />
        )}
        <Clapperboard className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white drop-shadow" />
      </div>
    );
  }
  if (p.image_url) {
    return (
      <div className="aspect-square overflow-hidden">
        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="relative aspect-square" style={{ background: gradientFor(p.id) }}>
      <p className="absolute inset-0 line-clamp-4 p-2 text-[10px] font-medium text-white/90">{p.text}</p>
    </div>
  );
}

export function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const isMe = !id || id === user?.id;

  const [viewedProfile, setViewedProfile] = useState<ProfileRow | null>(isMe ? myProfile : null);
  const [posts, setPosts] = useState<SimplePost[]>([]);
  const [savedPosts, setSavedPosts] = useState<FeedPost[] | null>(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState("posts");
  const [editing, setEditing] = useState(false);
  const [gifting, setGifting] = useState(false);

  const targetId = isMe ? user?.id : id;
  const displayProfile = isMe ? myProfile : viewedProfile;

  useEffect(() => {
    if (isMe) setViewedProfile(myProfile);
  }, [isMe, myProfile]);

  useEffect(() => {
    if (!targetId) return;
    if (!isMe) getProfile(targetId).then(setViewedProfile);
    listPostsByAuthor(targetId).then(setPosts).catch(() => setPosts([]));
    Promise.all([countPosts(targetId), countFollowers(targetId), countFollowing(targetId)]).then(
      ([p, followers, followingCount]) => setStats({ posts: p, followers, following: followingCount })
    );
    if (!isMe && user) isFollowing(user.id, targetId).then(setFollowing);
  }, [targetId, isMe, user]);

  useEffect(() => {
    if (tab !== "saved" || !isMe || !user || savedPosts !== null) return;
    listSavedPosts(user.id).then(setSavedPosts).catch(() => setSavedPosts([]));
  }, [tab, isMe, user, savedPosts]);

  const visibleTabs = isMe ? tabs : tabs.filter((t) => t.id !== "saved");
  const videoPosts = posts.filter((p) => p.video_url);

  const handleToggleFollow = async () => {
    if (!user || !targetId) return;
    setFollowing((f) => !f);
    setStats((s) => ({ ...s, followers: s.followers + (following ? -1 : 1) }));
    try {
      await toggleFollow(user.id, targetId, following);
    } catch {
      setFollowing((f) => !f);
      setStats((s) => ({ ...s, followers: s.followers + (following ? 1 : -1) }));
    }
  };

  const handleMessage = async () => {
    if (!user || !targetId) return;
    const conversationId = await getOrCreateConversationWith(user.id, targetId);
    navigate(`/chat/${conversationId}`);
  };

  if (!displayProfile) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-vyro-radial">
        <p className="text-sm text-mist">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="safe-top">
      <header className="flex items-center justify-between px-4 py-4">
        <h1 className="font-display text-xl font-bold text-ink">Profile</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/chat")} className="rounded-full p-2 chip text-mist">
            <MessageCircle className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Holographic avatar */}
      <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-cyan-400/25 animate-spin-slow" style={{ animationDuration: "18s" }} />
        <div className="absolute inset-4 rounded-full border border-violet-400/25" />
        <span className="absolute inset-0 rounded-full grad-primary opacity-20 blur-2xl animate-glow-pulse" />
        <Avatar name={displayProfile.name} avatarUrl={displayProfile.avatar_url} size={140} className="relative" />
        {isMe && (
          <button
            onClick={() => setEditing(true)}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 text-xs font-medium text-ink"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      <div className="px-5 pt-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <h2 className="font-display text-lg font-bold text-ink">{displayProfile.name}</h2>
          {displayProfile.verified && <BadgeCheck className="h-4.5 w-4.5 text-cyan-400" />}
        </div>
        <p className="text-sm text-mist">
          @{displayProfile.username} {displayProfile.location && `· ${displayProfile.location}`}
        </p>
        {displayProfile.bio && (
          <p className="mx-auto mt-2 max-w-[280px] whitespace-pre-line text-[13px] leading-relaxed text-ink/85">
            {displayProfile.bio}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-6">
        <Stat label="Posts" value={stats.posts} />
        <Stat label="Followers" value={stats.followers} />
        <Stat label="Following" value={stats.following} />
      </div>

      <div className="flex gap-2 px-5 pt-5">
        {isMe ? (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 rounded-full grad-purple-blue py-2.5 text-sm font-semibold text-white glow-violet"
          >
            Edit Profile
          </button>
        ) : (
          <>
            <button
              onClick={handleToggleFollow}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${
                following ? "chip text-ink" : "grad-purple-blue text-white glow-violet"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
            <button onClick={handleMessage} className="flex-1 rounded-full chip py-2.5 text-sm font-semibold text-ink">
              Message
            </button>
            <button
              onClick={() => setGifting(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full chip text-amber-300"
            >
              <Gift className="h-4.5 w-4.5" />
            </button>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-2 border-b border-white/5 px-5">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 rounded-t-xl py-3 text-center transition-colors ${
              tab === t.id ? "text-cyan-300" : "text-mist"
            }`}
          >
            <t.icon className="mx-auto h-5 w-5" />
            {tab === t.id && <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full grad-primary" />}
          </button>
        ))}
      </div>

      {tab === "posts" &&
        (posts.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-mist">No posts yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
            {posts.map((p) => (
              <PostThumb key={p.id} p={p} />
            ))}
          </div>
        ))}

      {tab === "videos" &&
        (videoPosts.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-mist">No videos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
            {videoPosts.map((p) => (
              <PostThumb key={p.id} p={p} />
            ))}
          </div>
        ))}

      {tab === "saved" &&
        (savedPosts === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : savedPosts.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-mist">Nothing saved yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
            {savedPosts.map((p) => (
              <PostThumb key={p.id} p={p} />
            ))}
          </div>
        ))}

      {tab === "reposts" && <p className="py-10 text-center text-[13px] text-mist">Nothing here yet.</p>}

      {editing && isMe && myProfile && (
        <EditProfileModal
          profile={myProfile}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            await refreshProfile();
            setEditing(false);
          }}
        />
      )}

      {gifting && !isMe && targetId && myProfile && (
        <GiftPicker
          receiverId={targetId}
          receiverName={displayProfile.name}
          myCoins={myProfile.coins}
          onClose={() => setGifting(false)}
          onSent={refreshProfile}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        setUploadingAvatar(true);
        avatarUrl = await uploadImage(profile.id, avatarFile);
        setUploadingAvatar(false);
      }
      await updateProfile(profile.id, {
        name: name.trim() || profile.name,
        bio: bio.trim(),
        location: location.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink">Edit Profile</p>
          <button onClick={onClose} className="rounded-full p-2 chip text-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-24 w-24 items-center justify-center"
          >
            <Avatar name={profile.name} avatarUrl={avatarPreview ?? profile.avatar_url} size={96} />
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full grad-primary text-white ring-2 ring-void">
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-mist">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl chip px-4 py-3 text-sm text-ink focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-mist">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="resize-none rounded-2xl chip px-4 py-3 text-sm text-ink focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-mist">Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-2xl chip px-4 py-3 text-sm text-ink focus:outline-none"
            />
          </label>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full grad-primary py-3 text-sm font-bold text-white glow-violet disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-display text-base font-bold text-ink">{formatCount(value)}</p>
      <p className="text-[11px] text-mist">{label}</p>
    </div>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}
