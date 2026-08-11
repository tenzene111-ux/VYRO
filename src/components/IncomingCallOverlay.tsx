import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar } from "./Avatar";
import { useCall } from "../context/CallContext";

export function IncomingCallOverlay() {
  const { callState, acceptCall, declineCall } = useCall();
  const navigate = useNavigate();

  if (callState.status !== "incoming") return null;

  const handleAccept = async () => {
    await acceptCall();
    navigate(`/call/${callState.kind}/${callState.peerId}`, { state: { name: callState.peerName } });
  };

  return (
    <div className="fixed inset-0 z-[100] mx-auto flex max-w-[480px] flex-col items-center justify-between bg-vyro-radial px-8 py-16">
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-[13px] font-medium text-mist">
          Incoming {callState.kind === "video" ? "video" : "voice"} call
        </p>
        <div className="relative">
          <span className="absolute inset-0 -m-3 rounded-full grad-primary opacity-30 blur-2xl animate-glow-pulse" />
          <Avatar name={callState.peerName} size={120} className="relative" />
        </div>
        <p className="font-display text-2xl font-bold text-ink">{callState.peerName}</p>
      </div>

      <div className="flex w-full max-w-[280px] items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={declineCall}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_10px_30px_-6px_rgba(244,63,94,0.7)] active:scale-95 transition-transform"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <span className="text-[11px] text-mist">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleAccept}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_30px_-6px_rgba(16,185,129,0.7)] active:scale-95 transition-transform"
          >
            {callState.kind === "video" ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </button>
          <span className="text-[11px] text-mist">Accept</span>
        </div>
      </div>
    </div>
  );
}
