import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { getProfile, getStoryHighlight, listHighlightItems, type StoryHighlightItem } from "../lib/api";
import type { Profile } from "../context/AuthContext";

const DURATION = 5000;

export function HighlightViewer() {
  const { highlightId } = useParams<{ highlightId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<StoryHighlightItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState<Profile | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!highlightId) return;
    listHighlightItems(highlightId).then(setItems);
    getStoryHighlight(highlightId).then(async (h) => {
      if (h) {
        setTitle(h.title);
        setOwner(await getProfile(h.owner_id));
      }
    });
  }, [highlightId]);

  useEffect(() => {
    if (paused || !items || items.length === 0) return;
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
  }, [index, paused, items]);

  if (items === null) {
    return (
      <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (items.length === 0) {
    navigate(-1);
    return null;
  }

  const current = items[index];

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
      {current.video_url ? (
        <video src={current.video_url} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline />
      ) : current.image_url ? (
        <img src={current.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
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
          {owner && <Avatar name={owner.name} avatarUrl={owner.avatar_url} size={36} />}
          <p className="text-[13px] font-semibold text-white">{title}</p>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-white/85 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
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
      </div>

      {current.caption && (
        <p className="relative z-10 px-8 pb-8 text-center text-[14px] font-semibold text-white drop-shadow-lg safe-bottom">
          {current.caption}
        </p>
      )}
    </div>
  );
}
