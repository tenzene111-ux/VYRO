import { useNavigate } from "react-router-dom";
import { Search, Mic, QrCode, MessageCircle, Flame, Music, Plane, Gamepad2, Trophy, Palette, ChevronRight } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { gradientFor } from "../lib/gradients";
import { trendingTopics, users } from "../data/mock";

const categories = [
  { id: "trending", label: "Trending", icon: Flame, grad: "from-orange-500 to-pink-500" },
  { id: "music", label: "Music", icon: Music, grad: "from-cyan-500 to-blue-500" },
  { id: "travel", label: "Travel", icon: Plane, grad: "from-violet-500 to-fuchsia-500" },
  { id: "gaming", label: "Gaming", icon: Gamepad2, grad: "from-blue-500 to-indigo-500" },
  { id: "sports", label: "Sports", icon: Trophy, grad: "from-amber-500 to-orange-500" },
  { id: "art", label: "Art & Design", icon: Palette, grad: "from-fuchsia-500 to-purple-600" },
];

const suggested = users.filter((u) => u.id !== "u0").slice(0, 2);

export function Explore() {
  const navigate = useNavigate();

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center justify-between py-4">
        <h1 className="font-display text-xl font-bold text-ink">Explore</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/chat")} className="rounded-full p-2 chip text-mist">
            <MessageCircle className="h-4.5 w-4.5" />
          </button>
          <button onClick={() => navigate("/create/sell")} className="rounded-full p-2 chip text-mist">
            <QrCode className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      <div className="mb-5 flex items-center gap-2 rounded-2xl chip px-4 py-3">
        <Search className="h-4.5 w-4.5 text-mist" />
        <input
          placeholder="Search VYRO"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
        />
        <Mic className="h-4.5 w-4.5 text-mist" />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {categories.map((c) => (
          <button
            key={c.id}
            className="flex flex-col items-center gap-2 rounded-2xl glass-card p-3.5 active:scale-95 transition-transform"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.grad}`}>
              <c.icon className="h-5 w-5 text-white" />
            </span>
            <span className="text-[12px] font-medium text-ink">{c.label}</span>
          </button>
        ))}
      </div>

      <SectionHeader title="Trending Now" />
      <div className="mb-6 flex flex-col gap-3">
        {trendingTopics.map((t) => (
          <button key={t.tag} className="flex items-center gap-3 rounded-2xl glass-card p-3 text-left active:scale-[0.98] transition-transform">
            <div className="h-14 w-14 shrink-0 rounded-xl" style={{ background: gradientFor(t.tag) }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{t.tag}</p>
              <p className="text-[11px] text-mist">Trending · {t.posts}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-mist" />
          </button>
        ))}
      </div>

      <SectionHeader title="People You May Know" />
      <div className="mb-6 grid grid-cols-2 gap-3">
        {suggested.map((u) => (
          <div key={u.id} className="flex flex-col items-center gap-2 rounded-2xl glass-card p-4 text-center">
            <Avatar name={u.name} size={64} />
            <div>
              <p className="text-sm font-semibold text-ink">{u.name}</p>
              <p className="text-[11px] text-mist">{Math.floor(Math.random() * 20) + 2} mutual friends</p>
            </div>
            <button className="mt-1 w-full rounded-full grad-purple-blue py-1.5 text-xs font-semibold text-white">
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-[15px] font-semibold text-ink">{title}</h2>
      <button className="text-xs font-medium text-violet-300">See All</button>
    </div>
  );
}
