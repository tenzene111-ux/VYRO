import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Heart, Gift, Send, Eye, Share2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { byId, liveStreams } from "../data/mock";
import { gradientFor } from "../lib/gradients";
import { giftCatalog } from "../data/mock";

const comments = [
  { user: "Sonam Wangdi", text: "This is amazing! 🔥" },
  { user: "Pema Choden", text: "Sending love from Thimphu 💜" },
  { user: "Tashi Gang", text: "🎉🎉🎉" },
];

export function LiveView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const stream = liveStreams.find((l) => l.id === id) ?? liveStreams[0];
  const host = byId(stream.userId);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ background: gradientFor(stream.id) }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/85" />

      <div className="relative z-10 flex items-center justify-between px-3 pt-4 safe-top">
        <div className="flex items-center gap-2 rounded-full bg-black/35 py-1 pl-1 pr-3 backdrop-blur">
          <Avatar name={host.name} size={32} online />
          <div>
            <p className="text-[12px] font-semibold text-white">{host.name}</p>
            <p className="flex items-center gap-1 text-[10px] text-white/70">
              <Eye className="h-2.5 w-2.5" /> {stream.viewers.toLocaleString()} watching
            </p>
          </div>
          <button
            onClick={() => setFollowing((f) => !f)}
            className={`ml-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              following ? "bg-white/15 text-white" : "grad-primary text-white"
            }`}
          >
            {following ? "Following" : "Follow"}
          </button>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-full bg-black/35 p-2 text-white backdrop-blur">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-10 mt-3 px-3">
        <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold text-white">● LIVE</span>
      </div>

      <div className="relative z-10 mt-auto flex flex-col gap-2 px-3 pb-4">
        <div className="flex flex-col gap-1.5">
          {comments.map((c, i) => (
            <p key={i} className="w-fit rounded-full bg-black/30 px-3 py-1.5 text-[12px] text-white backdrop-blur">
              <span className="font-semibold text-cyan-300">{c.user}</span> {c.text}
            </p>
          ))}
        </div>

        <div className="flex items-center gap-2 safe-bottom">
          <div className="flex flex-1 items-center rounded-full border border-white/20 bg-black/30 px-4 py-2.5 backdrop-blur">
            <input
              placeholder="Say something..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
            />
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur">
            <Send className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setGiftsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full grad-primary text-white glow-magenta active:scale-95 transition-transform"
          >
            <Gift className="h-4.5 w-4.5" />
          </button>
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur">
            <Heart className="h-4.5 w-4.5" />
          </button>
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur">
            <Share2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {giftsOpen && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/60" onClick={() => setGiftsOpen(false)}>
          <div className="w-full rounded-t-3xl glass-strong p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-display text-sm font-semibold text-ink">Send a Gift</p>
            <div className="grid grid-cols-3 gap-2.5">
              {giftCatalog.map((g) => (
                <button key={g.id} className="flex flex-col items-center gap-1 rounded-2xl glass-card p-3">
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="text-[11px] font-medium text-ink">{g.name}</span>
                  <span className="text-[10px] text-amber-300">🪙 {g.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
