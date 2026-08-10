import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Video, VideoOff, Mic, MicOff, Volume2, Sparkles, PhoneOff, RefreshCw } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { byId, currentUser } from "../data/mock";
import { gradientFor } from "../lib/gradients";

export function VideoCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = byId(id ?? "u2");
  const [camOff, setCamOff] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ background: gradientFor(user.id + "call") }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      <div className="relative z-10 flex items-center gap-3 px-3 pt-4 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full bg-black/35 p-2 text-white backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[13px] font-semibold text-white">{user.name}</p>
          <p className="text-[11px] text-white/70">
            {mm}:{ss}
          </p>
        </div>
      </div>

      <div className="absolute right-3 top-20 z-10 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 shadow-xl">
        {camOff ? (
          <div className="flex h-full w-full items-center justify-center bg-surface">
            <Avatar name={currentUser.name} size={40} />
          </div>
        ) : (
          <div className="h-full w-full" style={{ background: gradientFor(currentUser.id) }} />
        )}
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-between gap-2 px-5 pb-8 safe-bottom">
        <CallBtn onClick={() => setCamOff((c) => !c)} active={camOff}>
          {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </CallBtn>
        <CallBtn onClick={() => setMuted((m) => !m)} active={muted}>
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CallBtn>
        <button
          onClick={() => navigate(-1)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_10px_30px_-6px_rgba(244,63,94,0.7)] active:scale-95 transition-transform"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
        <CallBtn onClick={() => setSpeaker((s) => !s)} active={speaker}>
          <Volume2 className="h-5 w-5" />
        </CallBtn>
        <CallBtn onClick={() => {}}>
          <Sparkles className="h-5 w-5" />
        </CallBtn>
      </div>

      <button className="absolute bottom-32 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}

function CallBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-13 w-13 items-center justify-center rounded-full backdrop-blur transition-colors active:scale-95 ${
        active ? "bg-white text-void" : "bg-black/35 text-white"
      }`}
      style={{ height: 52, width: 52 }}
    >
      {children}
    </button>
  );
}
