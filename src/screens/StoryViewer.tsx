import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Send, Heart, MoreHorizontal } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { byId, stories } from "../data/mock";
import { gradientFor } from "../lib/gradients";

const DURATION = 5000;

export function StoryViewer() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const userStories = stories.filter((s) => s.userId === userId);
  const items = userStories.length > 0 ? userStories : [stories[0]];
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const user = byId(items[index].userId);

  useEffect(() => {
    if (paused) return;
    const start = Date.now() - progress * DURATION;
    const raf = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      setProgress(p);
      if (p >= 1) {
        if (index < items.length - 1) {
          setIndex((i) => i + 1);
          setProgress(0);
        } else {
          navigate(-1);
        }
      }
    }, 40);
    return () => clearInterval(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  const goPrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setProgress(0);
    } else navigate(-1);
  };
  const goNext = () => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setProgress(0);
    } else navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ background: gradientFor(items[index].id) }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

      <div className="relative z-10 flex gap-1.5 px-3 pt-4 safe-top">
        {items.map((it, i) => (
          <div key={it.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
            />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} size={36} />
          <div>
            <p className="text-[13px] font-semibold text-white">{user.name}</p>
            <p className="text-[11px] text-white/70">{items[index].time}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2 text-white/85 hover:bg-white/10">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <button onClick={() => navigate(-1)} className="rounded-full p-2 text-white/85 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative z-10 flex flex-1 items-center justify-center px-8"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <button className="absolute inset-y-0 left-0 z-20 w-1/3" onClick={goPrev} aria-label="Previous" />
        <button className="absolute inset-y-0 right-0 z-20 w-1/3" onClick={goNext} aria-label="Next" />
        {items[index].caption && (
          <p className="font-display text-2xl font-bold text-white drop-shadow-lg">{items[index].caption}</p>
        )}
      </div>

      <div className="relative z-10 flex items-center gap-2.5 px-3 pb-6 safe-bottom">
        <div className="flex flex-1 items-center rounded-full border border-white/25 bg-white/10 px-4 py-2.5 backdrop-blur">
          <input
            placeholder={`Reply to ${user.name.split(" ")[0]}...`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
          />
        </div>
        <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur active:scale-95 transition-transform">
          <Heart className="h-5 w-5" />
        </button>
        <button className="flex h-11 w-11 items-center justify-center rounded-full grad-primary text-white active:scale-95 transition-transform">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
