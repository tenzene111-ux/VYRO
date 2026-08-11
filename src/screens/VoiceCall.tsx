import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Mic, MicOff, Volume2, VolumeOff, PhoneOff } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useCall } from "../context/CallContext";

export function VoiceCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { callState, remoteStream, isMuted, toggleMute, hangUp } = useCall();
  const stateName = (location.state as { name?: string } | null)?.name;
  const [speakerOff, setSpeakerOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const inThisCall = callState.status !== "idle" && callState.peerId === id;
  const name = inThisCall ? callState.peerName : stateName ?? "VYRO User";
  const connecting = callState.status === "outgoing";

  useEffect(() => {
    if (audioRef.current) audioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (callState.status !== "active") return;
    setSeconds(Math.floor((Date.now() - callState.startedAt) / 1000));
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  useEffect(() => {
    if (callState.status === "idle") navigate(-1);
  }, [callState.status, navigate]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const handleEnd = () => {
    hangUp();
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col items-center bg-vyro-radial px-6">
      <audio ref={audioRef} autoPlay muted={speakerOff} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="relative">
          <span className="absolute inset-0 -m-3 rounded-full grad-primary opacity-25 blur-2xl animate-glow-pulse" />
          <Avatar name={name} size={140} className="relative" />
        </div>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink">{name}</p>
          <p className="mt-1 text-sm text-mist">{connecting ? "Calling…" : `${mm}:${ss}`}</p>
        </div>
      </div>

      <div className="mb-10 grid w-full max-w-[320px] grid-cols-3 gap-4">
        <CallBtn onClick={toggleMute} active={isMuted}>
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CallBtn>
        <button
          onClick={handleEnd}
          className="flex h-16 w-16 items-center justify-center justify-self-center rounded-full bg-rose-500 text-white shadow-[0_10px_30px_-6px_rgba(244,63,94,0.7)] active:scale-95 transition-transform"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
        <CallBtn onClick={() => setSpeakerOff((s) => !s)} active={speakerOff}>
          {speakerOff ? <VolumeOff className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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
