import { useNavigate } from "react-router-dom";
import { Radio, Eye, ArrowLeft } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { byId, liveStreams } from "../data/mock";
import { gradientFor } from "../lib/gradients";

export function Live() {
  const navigate = useNavigate();

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">VYRO Live</h1>
      </header>

      <button
        onClick={() => navigate("/live/go")}
        className="mb-6 flex w-full items-center justify-between overflow-hidden rounded-3xl p-5 glass-card glow-magenta"
      >
        <div className="text-left">
          <p className="font-display text-lg font-bold text-ink">Go Live, Inspire</p>
          <p className="mt-1 text-[12.5px] text-mist">Share your moments with the world</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white">
            <Radio className="h-3.5 w-3.5" /> Go Live
          </span>
        </div>
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full grad-primary">
          <span className="absolute inset-0 rounded-full grad-primary blur-lg opacity-70 animate-glow-pulse" />
          <Radio className="relative h-7 w-7 text-white" />
        </span>
      </button>

      <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">Trending Live</h2>
      <div className="grid grid-cols-2 gap-3">
        {liveStreams.map((l) => {
          const host = byId(l.userId);
          return (
            <button
              key={l.id}
              onClick={() => navigate(`/live/${l.id}`)}
              className="relative aspect-[3/4] overflow-hidden rounded-3xl text-left"
              style={{ background: gradientFor(l.id) }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />
              <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                <Radio className="h-2.5 w-2.5" /> LIVE
              </span>
              <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                <Eye className="h-2.5 w-2.5" /> {l.viewers > 999 ? `${(l.viewers / 1000).toFixed(1)}K` : l.viewers}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
                <Avatar name={host.name} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">{host.name}</p>
                  <p className="truncate text-[10.5px] text-white/75">{l.title}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
