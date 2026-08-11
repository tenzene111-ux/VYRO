import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Send, Heart, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { gradientFor } from "../lib/gradients";
import { useAuth } from "../context/AuthContext";
import { getOrCreateConversationWith, listActiveStories, recordStoryView, sendMessage, type StoryWithAuthor } from "../lib/api";

const DURATION = 5000;

export function StoryViewer() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<StoryWithAuthor[] | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listActiveStories().then((all) => {
      setItems(all.filter((s) => s.author.id === userId));
    });
  }, [userId]);

  useEffect(() => {
    if (!items || !user || !items[index]) return;
    recordStoryView(items[index].id, user.id).catch(() => {});
  }, [items, index, user]);

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
  const author = current.author;

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

  const send = async (text: string) => {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    try {
      const conversationId = await getOrCreateConversationWith(user.id, author.id);
      await sendMessage(conversationId, user.id, text.trim());
      setReply("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ background: gradientFor(current.id) }} />
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
          <Avatar name={author.name} size={36} />
          <div>
            <p className="text-[13px] font-semibold text-white">{author.name}</p>
            <p className="text-[11px] text-white/70">{timeAgo(current.created_at)}</p>
          </div>
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
        <p className="font-display text-2xl font-bold text-white drop-shadow-lg">{current.caption}</p>
      </div>

      <div className="relative z-10 flex items-center gap-2.5 px-3 pb-6 safe-bottom">
        <div className="flex flex-1 items-center rounded-full border border-white/25 bg-white/10 px-4 py-2.5 backdrop-blur">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(reply)}
            placeholder={`Reply to ${author.name.split(" ")[0]}...`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
          />
        </div>
        <button
          onClick={() => send("❤️")}
          disabled={sending}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-transform active:scale-95 disabled:opacity-50"
        >
          <Heart className="h-5 w-5" />
        </button>
        <button
          onClick={() => send(reply)}
          disabled={sending || !reply.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full grad-primary text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
