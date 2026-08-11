import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Video, VideoOff, Mic, MicOff, Volume2, VolumeOff, PhoneOff } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useCall } from "../context/CallContext";

export function VideoCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { callState, localStream, remoteStream, isMuted, isCameraOff, toggleMute, toggleCamera, hangUp } = useCall();
  const stateName = (location.state as { name?: string } | null)?.name;
  const [speakerOff, setSpeakerOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const inThisCall = callState.status !== "idle" && callState.peerId === id;
  const name = inThisCall ? callState.peerName : stateName ?? "VYRO User";
  const connecting = callState.status === "outgoing";

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
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
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      {remoteStream ? (
        <video ref={remoteVideoRef} autoPlay playsInline muted={speakerOff} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <Avatar name={name} size={120} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      <div className="relative z-10 flex items-center gap-3 px-3 pt-4 safe-top">
        <button onClick={handleEnd} className="rounded-full bg-black/35 p-2 text-white backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[13px] font-semibold text-white">{name}</p>
          <p className="text-[11px] text-white/70">{connecting ? "Calling…" : `${mm}:${ss}`}</p>
        </div>
      </div>

      <div className="absolute right-3 top-20 z-10 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 shadow-xl">
        {isCameraOff || !localStream ? (
          <div className="flex h-full w-full items-center justify-center bg-surface">
            <Avatar name="You" size={40} />
          </div>
        ) : (
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        )}
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-between gap-2 px-5 pb-8 safe-bottom">
        <CallBtn onClick={toggleCamera} active={isCameraOff}>
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </CallBtn>
        <CallBtn onClick={toggleMute} active={isMuted}>
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CallBtn>
        <button
          onClick={handleEnd}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_10px_30px_-6px_rgba(244,63,94,0.7)] active:scale-95 transition-transform"
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
      className={`flex h-13 w-13 items-center justify-center rounded-full backdrop-blur transition-colors active:scale-95 ${
        active ? "bg-white text-void" : "bg-black/35 text-white"
      }`}
      style={{ height: 52, width: 52 }}
    >
      {children}
    </button>
  );
}
