import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { logCall } from "../lib/api";

export type CallKind = "voice" | "video";

export type CallState =
  | { status: "idle" }
  | { status: "outgoing"; callId: string; peerId: string; peerName: string; kind: CallKind }
  | { status: "incoming"; callId: string; peerId: string; peerName: string; kind: CallKind }
  | { status: "active"; callId: string; peerId: string; peerName: string; kind: CallKind; startedAt: number };

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const RING_TIMEOUT_MS = 30000;

type CallContextValue = {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  startCall: (peerId: string, peerName: string, kind: CallKind) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

async function sendOnce(topic: string, event: string, payload: Record<string, unknown>) {
  const channel = supabase.channel(topic);
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event, payload }).finally(() => resolve());
      }
    });
  });
  supabase.removeChannel(channel);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [callState, setCallState] = useState<CallState>({ status: "idle" });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingOfferRef = useRef<{
    callId: string;
    offer: RTCSessionDescriptionInit;
    kind: CallKind;
    peerId: string;
    peerName: string;
  } | null>(null);
  const callStartRef = useRef<number>(0);
  const roleRef = useRef<"caller" | "callee" | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`call-inbox:${user.id}`)
      .on("broadcast", { event: "incoming-call" }, ({ payload }) => {
        setCallState((prev) => {
          if (prev.status !== "idle") return prev;
          pendingOfferRef.current = {
            callId: payload.callId,
            offer: payload.offer,
            kind: payload.kind,
            peerId: payload.callerId,
            peerName: payload.callerName,
          };
          return { status: "incoming", callId: payload.callId, peerId: payload.callerId, peerName: payload.callerName, kind: payload.kind };
        });
      })
      .on("broadcast", { event: "call-cancelled" }, ({ payload }) => {
        setCallState((prev) => (prev.status === "incoming" && prev.callId === payload.callId ? { status: "idle" } : prev));
        pendingOfferRef.current = null;
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  };

  const cleanup = () => {
    clearRingTimeout();
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
    pendingOfferRef.current = null;
    remoteCandidateQueueRef.current = [];
    remoteDescSetRef.current = false;
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const endCall = (outcome: "completed" | "missed" | "declined") => {
    const state = callState;
    if (roleRef.current === "caller" && state.status !== "idle" && user) {
      const duration = state.status === "active" ? Math.round((Date.now() - callStartRef.current) / 1000) : 0;
      logCall(user.id, state.peerId, state.kind, outcome, duration).catch(() => {});
    }
    roleRef.current = null;
    cleanup();
    setCallState({ status: "idle" });
  };

  function attachPeerHandlers(pc: RTCPeerConnection, channel: ReturnType<typeof supabase.channel>) {
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({ type: "broadcast", event: "ice-candidate", payload: { candidate: e.candidate.toJSON() } });
      }
    };
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };
  }

  const startCall = async (peerId: string, peerName: string, kind: CallKind) => {
    if (!user || !profile || callState.status !== "idle") return;
    const callId = crypto.randomUUID();
    roleRef.current = "caller";
    setCallState({ status: "outgoing", callId, peerId, peerName, kind });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
    } catch {
      roleRef.current = null;
      setCallState({ status: "idle" });
      return;
    }
    setLocalStream(stream);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const callChannel = supabase.channel(`call:${callId}`);
    callChannelRef.current = callChannel;
    attachPeerHandlers(pc, callChannel);

    callChannel
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (pc.signalingState === "closed") return;
        await pc.setRemoteDescription(payload.answer);
        remoteDescSetRef.current = true;
        for (const c of remoteCandidateQueueRef.current) {
          try {
            await pc.addIceCandidate(c);
          } catch {
            /* ignore */
          }
        }
        remoteCandidateQueueRef.current = [];
        clearRingTimeout();
        callStartRef.current = Date.now();
        setCallState((prev) =>
          prev.status === "outgoing"
            ? { status: "active", callId, peerId: prev.peerId, peerName: prev.peerName, kind: prev.kind, startedAt: Date.now() }
            : prev
        );
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (!remoteDescSetRef.current) {
          remoteCandidateQueueRef.current.push(payload.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* ignore */
        }
      })
      .on("broadcast", { event: "call-declined" }, () => endCall("declined"))
      .on("broadcast", { event: "hangup" }, () => endCall("completed"))
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendOnce(`call-inbox:${peerId}`, "incoming-call", {
          callId,
          callerId: user.id,
          callerName: profile.name,
          kind,
          offer,
        });
        ringTimeoutRef.current = setTimeout(() => endCall("missed"), RING_TIMEOUT_MS);
      });
  };

  const acceptCall = async () => {
    const pending = pendingOfferRef.current;
    if (!pending) return;
    roleRef.current = "callee";
    const { callId, offer, kind, peerId, peerName } = pending;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
    } catch {
      declineCall();
      return;
    }
    setLocalStream(stream);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const callChannel = supabase.channel(`call:${callId}`);
    callChannelRef.current = callChannel;
    attachPeerHandlers(pc, callChannel);

    callChannel
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (!remoteDescSetRef.current) {
          remoteCandidateQueueRef.current.push(payload.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* ignore */
        }
      })
      .on("broadcast", { event: "hangup" }, () => endCall("completed"))
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await pc.setRemoteDescription(offer);
        remoteDescSetRef.current = true;
        for (const c of remoteCandidateQueueRef.current) {
          try {
            await pc.addIceCandidate(c);
          } catch {
            /* ignore */
          }
        }
        remoteCandidateQueueRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        callChannel.send({ type: "broadcast", event: "answer", payload: { answer } });
      });

    callStartRef.current = Date.now();
    pendingOfferRef.current = null;
    setCallState({ status: "active", callId, peerId, peerName, kind, startedAt: Date.now() });
  };

  const declineCall = () => {
    const pending = pendingOfferRef.current;
    if (pending) {
      sendOnce(`call:${pending.callId}`, "call-declined", {}).catch(() => {});
    }
    pendingOfferRef.current = null;
    setCallState({ status: "idle" });
  };

  const hangUp = () => {
    if (callChannelRef.current) {
      callChannelRef.current.send({ type: "broadcast", event: "hangup", payload: {} });
    }
    if (callState.status === "outgoing") {
      sendOnce(`call-inbox:${callState.peerId}`, "call-cancelled", { callId: callState.callId }).catch(() => {});
    }
    endCall(callState.status === "active" ? "completed" : "missed");
  };

  const toggleMute = () => {
    if (!localStream) return;
    const next = !isMuted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setIsMuted(next);
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const next = !isCameraOff;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setIsCameraOff(next);
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        startCall,
        acceptCall,
        declineCall,
        hangUp,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
