import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pencil, Grid3x3, Clapperboard, Bookmark, Repeat2, User as UserIcon, BadgeCheck, MessageCircle } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { currentUser, users } from "../data/mock";
import { gradientFor } from "../lib/gradients";

const tabs = [
  { id: "posts", icon: Grid3x3 },
  { id: "videos", icon: Clapperboard },
  { id: "saved", icon: Bookmark },
  { id: "reposts", icon: Repeat2 },
];

export function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = id ? users.find((u) => u.id === id) ?? currentUser : currentUser;
  const isMe = user.id === currentUser.id;
  const [tab, setTab] = useState("posts");

  return (
    <div className="safe-top">
      <header className="flex items-center justify-between px-4 py-4">
        <h1 className="font-display text-xl font-bold text-ink">Profile</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/chat")} className="rounded-full p-2 chip text-mist">
            <MessageCircle className="h-4.5 w-4.5" />
          </button>
          {isMe && (
            <button className="rounded-full p-2 chip text-mist">
              <UserIcon className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </header>

      {/* Holographic avatar */}
      <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-cyan-400/25 animate-spin-slow" style={{ animationDuration: "18s" }} />
        <div className="absolute inset-4 rounded-full border border-violet-400/25" />
        <span className="absolute inset-0 rounded-full grad-primary opacity-20 blur-2xl animate-glow-pulse" />
        <Avatar name={user.name} size={140} className="relative" />
        {isMe && (
          <button className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 text-xs font-medium text-ink">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      <div className="px-5 pt-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <h2 className="font-display text-lg font-bold text-ink">{user.name}</h2>
          {user.verified && <BadgeCheck className="h-4.5 w-4.5 text-cyan-400" />}
        </div>
        <p className="text-sm text-mist">
          @{user.username} {user.location && `· ${user.location}`}
        </p>
        {isMe && (
          <p className="mx-auto mt-2 max-w-[280px] whitespace-pre-line text-[13px] leading-relaxed text-ink/85">
            {user.bio}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-6">
        <Stat label="Posts" value={user.posts ?? 128} />
        <Stat label="Friends" value={user.friends ?? 340} />
        <Stat label="Followers" value={user.followers ?? 4200} />
        <Stat label="Following" value={user.following ?? 512} />
      </div>

      <div className="flex gap-2 px-5 pt-5">
        {isMe ? (
          <button className="flex-1 rounded-full grad-purple-blue py-2.5 text-sm font-semibold text-white glow-violet">
            Edit Profile
          </button>
        ) : (
          <>
            <button className="flex-1 rounded-full grad-purple-blue py-2.5 text-sm font-semibold text-white glow-violet">
              Follow
            </button>
            <button className="flex-1 rounded-full chip py-2.5 text-sm font-semibold text-ink">Message</button>
          </>
        )}
        <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full chip text-mist">
          <UserIcon className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2 border-b border-white/5 px-5">
        {tabs.map((t) => (
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

      <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square" style={{ background: gradientFor(user.id + i) }} />
        ))}
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
