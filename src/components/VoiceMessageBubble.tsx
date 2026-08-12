import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceMessageBubble({ url, duration, mine }: { url: string; duration: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${mine ? "bg-white/20" : "grad-primary"}`}
      >
        {playing ? <Pause className="h-3.5 w-3.5 text-white" /> : <Play className="h-3.5 w-3.5 text-white" />}
      </button>
      <div className="flex min-w-[110px] flex-1 items-center gap-2">
        <div className={`h-1 flex-1 overflow-hidden rounded-full ${mine ? "bg-white/25" : "bg-white/10"}`}>
          <div className={`h-full ${mine ? "bg-white" : "grad-primary"}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={`text-[10.5px] ${mine ? "text-white/80" : "text-mist"}`}>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
