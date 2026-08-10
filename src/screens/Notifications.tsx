import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, MessageCircle, UserPlus, Users2, Radio, AtSign, Settings2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { notifications, byId } from "../data/mock";

const filters = ["All", "Mentions", "Likes", "Comments", "Friends", "Groups"];

const iconFor: Record<string, typeof Heart> = {
  likes: Heart,
  comments: MessageSquare,
  friends: UserPlus,
  followers: UserPlus,
  mentions: AtSign,
  groups: Users2,
  live: Radio,
  system: Settings2,
};

const colorFor: Record<string, string> = {
  likes: "text-rose-400",
  comments: "text-cyan-400",
  friends: "text-blue-400",
  followers: "text-blue-400",
  mentions: "text-violet-400",
  groups: "text-emerald-400",
  live: "text-red-400",
  system: "text-amber-300",
};

export function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const filtered = notifications.filter((n) => {
    if (filter === "All") return true;
    const map: Record<string, string> = {
      Mentions: "mentions",
      Likes: "likes",
      Comments: "comments",
      Friends: "friends",
      Groups: "groups",
    };
    return n.category === map[filter];
  });

  return (
    <div className="safe-top">
      <header className="flex items-center justify-between px-4 py-4">
        <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/chat")} className="rounded-full p-2 chip text-mist">
            <MessageCircle className="h-4.5 w-4.5" />
          </button>
          <button className="rounded-full p-2 chip text-mist">
            <Settings2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "grad-purple-blue text-white" : "chip text-mist"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col px-3 py-2">
        {filtered.map((n) => {
          const Icon = iconFor[n.category];
          const first = n.userIds[0] ? byId(n.userIds[0]) : null;
          return (
            <button
              key={n.id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.03] ${
                !n.read ? "bg-violet-500/[0.06]" : ""
              }`}
            >
              <div className="relative shrink-0">
                {first ? <Avatar name={first.name} size={44} /> : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full grad-primary">
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                )}
                {first && (
                  <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface ${colorFor[n.category]}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="flex-1 text-[13px] leading-snug text-ink/90">
                {first && <span className="font-semibold text-ink">{first.name} </span>}
                {n.text}
              </p>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] text-mist">{n.time}</span>
                {!n.read && <span className="h-2 w-2 rounded-full bg-cyan-400" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
