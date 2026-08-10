import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, Volume2, Bluetooth, UserPlus, PhoneOff } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { byId } from "../data/mock";

export function VoiceCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = byId(id ?? "u1");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col items-center bg-vyro-radial px-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="relative">
          <span className="absolute inset-0 -m-3 rounded-full grad-primary opacity-25 blur-2xl animate-glow-pulse" />
          <Avatar name={user.name} size={140} className="relative" />
        </div>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink">{user.name}</p>
          <p className="mt-1 text-sm text-mist">
            {mm}:{ss}
          </p>
        </div>
      </div>

      <div className="mb-10 grid w-full max-w-[320px] grid-cols-3 gap-4">
        <CallBtn onClick={() => setMuted((m) => !m)} active={muted}>
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CallBtn>
        <button
          onClick={() => navigate(-1)}
          className="flex h-16 w-16 items-center justify-center justify-self-center rounded-full bg-rose-500 text-white shadow-[0_10px_30px_-6px_rgba(244,63,94,0.7)] active:scale-95 transition-transform"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
        <CallBtn onClick={() => setSpeaker((s) => !s)} active={speaker}>
          <Volume2 className="h-5 w-5" />
        </CallBtn>
        <CallBtn onClick={() => {}}>
          <Bluetooth className="h-5 w-5" />
        </CallBtn>
        <div />
        <CallBtn onClick={() => {}}>
          <UserPlus className="h-5 w-5" />
        </CallBtn>
      </div>
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
      className={`flex h-14 w-14 items-center justify-center justify-self-center rounded-full transition-colors active:scale-95 ${
        active ? "bg-white text-void" : "glass-strong text-ink"
      }`}
    >
      {children}
    </button>
  );
}
