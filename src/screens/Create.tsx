import { useNavigate } from "react-router-dom";
import { FileText, Clapperboard, Radio, Video, ChevronRight } from "lucide-react";
import { gradientFor } from "../lib/gradients";

const options = [
  { label: "Short Video", desc: "Camera, effects, music", icon: Clapperboard, to: "/create/reel", grad: "from-orange-400 to-pink-500" },
  { label: "Post", desc: "Text, photo, poll or link", icon: FileText, to: "/create/post", grad: "from-cyan-400 to-blue-500" },
  { label: "Live Streaming", desc: "Go live to your followers", icon: Radio, to: "/live/go", grad: "from-red-500 to-rose-500" },
  { label: "Go Live", desc: "Start streaming now", icon: Video, to: "/live/go", grad: "from-violet-400 to-indigo-500" },
];

const templateCategories = ["Trending", "Popular", "Bhutan", "Saved", "Cinematic", "Comedy", "Travel"];

export function Create() {
  const navigate = useNavigate();

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center justify-between py-4">
        <h1 className="font-display text-xl font-bold text-ink">Create</h1>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => navigate(opt.to)}
            className="flex flex-col items-start gap-3 rounded-3xl glass-card p-4 text-left active:scale-[0.98] transition-transform"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${opt.grad} shadow-lg`}>
              <opt.icon className="h-6 w-6 text-white" strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{opt.label}</span>
              <span className="block text-[11.5px] leading-tight text-mist">{opt.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-ink">Templates</p>
        <button onClick={() => navigate("/explore")} className="flex items-center gap-0.5 text-[12px] font-medium text-violet-300">
          See All <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {templateCategories.map((c) => (
          <span key={c} className="shrink-0 rounded-full chip px-3.5 py-1.5 text-[12px] font-semibold text-mist">
            {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 pb-8">
        {templateCategories.slice(0, 6).map((c) => (
          <button
            key={c}
            onClick={() => navigate("/create/reel")}
            className="flex aspect-[3/4] items-end overflow-hidden rounded-2xl p-2"
            style={{ background: gradientFor(c) }}
          >
            <span className="text-[11px] font-semibold text-white drop-shadow">{c}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
