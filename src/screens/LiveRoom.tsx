import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  X,
  Heart,
  Gift,
  Send,
  Eye,
  Share2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  PhoneOff,
  Users,
  BarChart3,
  Swords,
  Flag,
  Pin,
  Trash2,
  Loader2,
  MoreVertical,
  UserPlus,
  Ban,
} from "lucide-react";
import { Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrackPublication } from "livekit-client";
import { Avatar } from "../components/Avatar";
import { supabase } from "../lib/supabase";
import { GiftPicker } from "../components/GiftPicker";
import { gradientFor } from "../lib/gradients";
import { useAuth } from "../context/AuthContext";
import { connectToLiveRoom, joinLivePresence, joinLiveReactions, type LivePresenceHandle } from "../lib/live";
import { uploadVideoBlob } from "../lib/storage";
import { giftCatalog } from "../data/mock";
import {
  getLiveSession,
  endLive,
  updatePeakViewers,
  setReplay,
  listLiveMessages,
  sendLiveMessage,
  subscribeToLiveMessages,
  pinLiveMessage,
  deleteLiveMessage,
  blockLiveViewer,
  joinLiveAsViewer,
  leaveLiveAsViewer,
  getLiveAnalytics,
  getActiveLivePoll,
  createLivePoll,
  closeLivePoll,
  voteLivePoll,
  getLivePollVotes,
  subscribeToLivePollVotes,
  getMyGuestInvite,
  inviteLiveGuest,
  respondToGuestInvite,
  removeLiveGuest,
  listLiveGuests,
  subscribeToLiveGuests,
  createLiveMatch,
  getActiveMatchForLive,
  getMatchScore,
  endLiveMatch,
  listLiveNow,
  reportLive,
  subscribeToLiveSession,
  subscribeToLiveGifts,
  searchPeopleAndPosts,
  toggleFollow,
  isFollowing,
  type LiveSessionWithHost,
  type LiveMessage,
  type LiveAnalytics,
  type LivePoll,
  type LiveGuest,
  type LiveMatch,
  type LiveGiftEvent,
} from "../lib/api";
import type { Profile } from "../context/AuthContext";

type Role = "host" | "guest" | "viewer";

export function LiveRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const liveId = id!;

  const [live, setLive] = useState<LiveSessionWithHost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);

  const [role, setRole] = useState<Role>("viewer");
  const [connecting, setConnecting] = useState(true);
  const [connectError, setConnectError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const remoteContainers = useRef(new Map<string, HTMLDivElement>());
  const attachedSids = useRef(new Set<string>());
  const attachedEls = useRef(new Map<string, HTMLMediaElement[]>());

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const [viewerCount, setViewerCount] = useState(0);
  const presenceRef = useRef<LivePresenceHandle | null>(null);
  const viewerSessionIdRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [floatingHearts, setFloatingHearts] = useState<{ id: number; emoji: string }[]>([]);
  const [gifts, setGifts] = useState<(LiveGiftEvent & { key: number })[]>([]);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);

  const [following, setFollowingState] = useState(false);

  const [poll, setPoll] = useState<LivePoll | null>(null);
  const [pollVotes, setPollVotes] = useState<{ option_index: number; user_id: string }[]>([]);
  const [pollModalOpen, setPollModalOpen] = useState(false);

  const [guests, setGuests] = useState<LiveGuest[]>([]);
  const [myInvite, setMyInvite] = useState<LiveGuest | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [guestsPanelOpen, setGuestsPanelOpen] = useState(false);

  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [matchScore, setMatchScore] = useState({ scoreA: 0, scoreB: 0 });
  const [opponent, setOpponent] = useState<LiveSessionWithHost | null>(null);
  const [battleModalOpen, setBattleModalOpen] = useState(false);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [endingLive, setEndingLive] = useState(false);
  const [summary, setSummary] = useState<LiveAnalytics | null>(null);

  const isHost = !!(live && user && live.host_id === user.id);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const endedRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const videoDeviceIndexRef = useRef(0);

  // ---------- initial load ----------
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getLiveSession(liveId).then((data) => {
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLive(data);
      if (data.status === "ended" || data.status === "replay_ready" || data.status === "deleted") {
        setStreamEnded(true);
        setConnecting(false);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [liveId, user]);

  // ---------- connect to LiveKit + wire realtime once live is known and active ----------
  useEffect(() => {
    if (!live || !user || streamEnded) return;
    let cancelled = false;

    const iAmHost = live.host_id === user.id;

    (async () => {
      try {
        let publish = false;
        let myRole: Role = "viewer";
        if (iAmHost) {
          publish = true;
          myRole = "host";
        } else {
          const invite = await getMyGuestInvite(liveId, user.id);
          if (invite && invite.status === "accepted") {
            publish = true;
            myRole = "guest";
          }
        }

        const { room, localStream: stream } = await connectToLiveRoom(liveId, { publish });
        if (cancelled) {
          room.disconnect();
          return;
        }
        roomRef.current = room;
        setRole(myRole);
        setLocalStream(stream);
        setConnecting(false);

        if (publish && stream) {
          try {
            const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
          } catch {
            // recording unsupported on this browser — replay just won't be available
          }
        }

        if (!publish) {
          const viewerSessionId = await joinLiveAsViewer(liveId, user.id).catch(() => null);
          viewerSessionIdRef.current = viewerSessionId;
        }

        const attachAllPending = () => {
          room.remoteParticipants.forEach((participant) => {
            const container = remoteContainers.current.get(participant.identity);
            if (!container) return;
            participant.trackPublications.forEach((pub) => {
              if (!pub.track || !pub.isSubscribed) return;
              if (attachedSids.current.has(pub.trackSid)) return;
              const el = pub.track.attach();
              el.className = pub.kind === "video" ? "h-full w-full object-cover" : "hidden";
              container.appendChild(el);
              attachedSids.current.add(pub.trackSid);
              const arr = attachedEls.current.get(participant.identity) ?? [];
              arr.push(el);
              attachedEls.current.set(participant.identity, arr);
            });
          });
        };

        // The video grid is for co-hosts/battle opponents only — a plain viewer
        // connects to the LiveKit room too (to subscribe to the host's stream)
        // but never publishes a camera track, so gate grid membership on an
        // actual subscribed video publication rather than mere room presence.
        // Otherwise every viewer who tunes in silently claims a grid tile and
        // splits the host's own video in half.
        const hasSubscribedVideo = (participant: RemoteParticipant) =>
          [...participant.trackPublications.values()].some((pub) => pub.kind === "video" && pub.isSubscribed);

        const addParticipant = (participant: RemoteParticipant) => {
          setRemoteIds((ids) => (ids.includes(participant.identity) ? ids : [...ids, participant.identity]));
        };
        const removeParticipant = (participant: RemoteParticipant) => {
          setRemoteIds((ids) => ids.filter((i) => i !== participant.identity));
        };

        room.remoteParticipants.forEach((participant) => {
          if (hasSubscribedVideo(participant)) addParticipant(participant);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          removeParticipant(participant);
          (attachedEls.current.get(participant.identity) ?? []).forEach((el) => el.remove());
          attachedEls.current.delete(participant.identity);
          remoteContainers.current.delete(participant.identity);
        });
        room.on(
          RoomEvent.TrackSubscribed,
          (track: Track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === "video") addParticipant(participant);
            requestAnimationFrame(attachAllPending);
          }
        );
        room.on(
          RoomEvent.TrackUnsubscribed,
          (track: Track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            track.detach().forEach((el) => el.remove());
            if (track.kind === "video" && !hasSubscribedVideo(participant)) removeParticipant(participant);
          }
        );

        // retry-attach once more shortly after, to cover any race between container mount and track arrival
        setTimeout(attachAllPending, 300);
      } catch (e) {
        if (!cancelled) setConnectError(e instanceof Error ? e.message : "Couldn't connect to the live stream.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.id, user?.id, streamEnded]);

  // attach local preview
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  // ---------- presence (real viewer count) ----------
  useEffect(() => {
    if (!user || !live || streamEnded) return;
    const handle = joinLivePresence(liveId, user.id, isHost ? "host" : "viewer", (count) => {
      setViewerCount(count);
      if (isHostRef.current) updatePeakViewers(liveId, count).catch(() => {});
    });
    presenceRef.current = handle;
    return () => handle.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, user?.id, live?.id, streamEnded]);

  // ---------- chat ----------
  useEffect(() => {
    if (!live || streamEnded) return;
    listLiveMessages(liveId).then(setMessages).catch(() => setMessages([]));
    const unsub = subscribeToLiveMessages(liveId, async (raw) => {
      const { data: sender } = await supabase.from("profiles").select("*").eq("id", raw.sender_id).single();
      if (!sender) return;
      setMessages((prev) =>
        prev.some((m) => m.id === raw.id)
          ? prev
          : [...prev, { id: raw.id, text: raw.text, pinned: raw.pinned, created_at: raw.created_at, sender }]
      );
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, live?.id, streamEnded]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- reactions ----------
  const reactionsRef = useRef<ReturnType<typeof joinLiveReactions> | null>(null);
  useEffect(() => {
    if (!live || streamEnded) return;
    const r = joinLiveReactions(liveId, (emoji) => {
      const key = Date.now() + Math.random();
      setFloatingHearts((h) => [...h, { id: key, emoji }]);
      setTimeout(() => setFloatingHearts((h) => h.filter((x) => x.id !== key)), 2200);
    });
    reactionsRef.current = r;
    return () => r.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, live?.id, streamEnded]);

  // ---------- gifts feed ----------
  useEffect(() => {
    if (!live || streamEnded) return;
    const unsub = subscribeToLiveGifts(liveId, (event) => {
      const key = Date.now() + Math.random();
      setGifts((g) => [...g.slice(-4), { ...event, key }]);
      setTimeout(() => setGifts((g) => g.filter((x) => x.key !== key)), 5000);
      // the coins already landed server-side the moment send_gift() ran —
      // this just brings the host's own cached balance (from AuthContext) in
      // sync so it doesn't look like the gift never arrived
      if (isHostRef.current) refreshProfile();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, live?.id, streamEnded]);

  // ---------- follow state ----------
  useEffect(() => {
    if (!user || !live || live.host_id === user.id) return;
    isFollowing(user.id, live.host_id).then(setFollowingState);
  }, [user, live]);

  // ---------- polls ----------
  useEffect(() => {
    if (!live || streamEnded) return;
    getActiveLivePoll(liveId).then((p) => {
      setPoll(p);
      if (p) getLivePollVotes(p.id).then(setPollVotes);
    });
  }, [liveId, live?.id, streamEnded]);

  useEffect(() => {
    if (!poll) return;
    const refresh = () => getLivePollVotes(poll.id).then(setPollVotes);
    const unsub = subscribeToLivePollVotes(poll.id, refresh);
    return unsub;
  }, [poll?.id]);

  // ---------- guests / co-host ----------
  useEffect(() => {
    if (!live || streamEnded) return;
    if (isHost) listLiveGuests(liveId).then(setGuests);
    if (user && !isHost) getMyGuestInvite(liveId, user.id).then(setMyInvite);
  }, [liveId, live?.id, isHost, user, streamEnded]);

  useEffect(() => {
    if (!live || streamEnded) return;
    const unsub = subscribeToLiveGuests(liveId, () => {
      if (isHostRef.current) listLiveGuests(liveId).then(setGuests);
      if (user && !isHostRef.current) getMyGuestInvite(liveId, user.id).then(setMyInvite);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, live?.id, streamEnded, user?.id]);

  // ---------- match / battle ----------
  useEffect(() => {
    if (!live || streamEnded) return;
    getActiveMatchForLive(liveId).then(setMatch);
  }, [liveId, live?.id, streamEnded]);

  useEffect(() => {
    if (!match) {
      setOpponent(null);
      return;
    }
    const opponentId = match.live_id_a === liveId ? match.live_id_b : match.live_id_a;
    getLiveSession(opponentId).then(setOpponent);
  }, [match, liveId]);

  useEffect(() => {
    if (!match || match.status !== "active") return;
    const refresh = () => getMatchScore(match.id).then(setMatchScore).catch(() => {});
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [match?.id, match?.status]);

  useEffect(() => {
    if (!match || match.status !== "active" || !isHost || match.live_id_a !== liveId) return;
    const check = setInterval(async () => {
      if (Date.now() < new Date(match.ends_at).getTime()) return;
      const score = await getMatchScore(match.id);
      const winner = score.scoreA === score.scoreB ? null : score.scoreA > score.scoreB ? match.live_id_a : match.live_id_b;
      await endLiveMatch(match.id, winner);
      setMatch((m) => (m ? { ...m, status: "ended", winner_live_id: winner } : m));
    }, 4000);
    return () => clearInterval(check);
  }, [match, isHost, liveId]);

  // ---------- stream ended detection (non-host) ----------
  useEffect(() => {
    if (!live || isHost) return;
    const unsub = subscribeToLiveSession(liveId, (row) => {
      setLive((l) => (l ? { ...l, ...row } : l));
      if (row.status === "ended" || row.status === "replay_ready") {
        setStreamEnded(true);
        roomRef.current?.disconnect();
      }
    });
    return unsub;
  }, [liveId, live?.id, isHost]);

  // ---------- cleanup ----------
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      presenceRef.current?.unsubscribe();
      if (viewerSessionIdRef.current) leaveLiveAsViewer(viewerSessionIdRef.current).catch(() => {});
      if (isHostRef.current && !endedRef.current && live?.id) {
        endLive(live.id).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- actions ----------
  const handleSendChat = async () => {
    if (!user || !chatText.trim() || sendingChat) return;
    setSendingChat(true);
    const text = chatText.trim();
    setChatText("");
    try {
      await sendLiveMessage(liveId, user.id, text);
    } catch {
      setChatText(text);
    } finally {
      setSendingChat(false);
    }
  };

  const handleReact = () => {
    reactionsRef.current?.send("❤️");
    const key = Date.now() + Math.random();
    setFloatingHearts((h) => [...h, { id: key, emoji: "❤️" }]);
    setTimeout(() => setFloatingHearts((h) => h.filter((x) => x.id !== key)), 2200);
  };

  const handleFollow = async () => {
    if (!user || !live) return;
    const next = !following;
    setFollowingState(next);
    await toggleFollow(user.id, live.host_id, !next).catch(() => setFollowingState(!next));
  };

  const handleGiftSent = (giftKey: string, emoji: string) => {
    void giftKey;
    refreshProfile();
    const key = Date.now() + Math.random();
    setFloatingHearts((h) => [...h, { id: key, emoji }]);
    setTimeout(() => setFloatingHearts((h) => h.filter((x) => x.id !== key)), 2200);
  };

  const toggleMic = async () => {
    const next = !micOn;
    await roomRef.current?.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const next = !camOn;
    await roomRef.current?.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  };

  const flipCamera = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      if (videoDevicesRef.current.length === 0) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevicesRef.current = devices.filter((d) => d.kind === "videoinput");
      }
      const devices = videoDevicesRef.current;
      if (devices.length < 2) return;
      videoDeviceIndexRef.current = (videoDeviceIndexRef.current + 1) % devices.length;
      const next = devices[videoDeviceIndexRef.current];
      await room.switchActiveDevice("videoinput", next.deviceId);
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const stream = pub?.track?.mediaStream ?? null;
      if (stream) setLocalStream(stream);
    } catch {
      // device switch not supported — ignore, control stays a no-op
    }
  };

  const stopRecorderAndGetBlob = async (): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    return recordedChunksRef.current.length ? new Blob(recordedChunksRef.current, { type: "video/webm" }) : null;
  };

  const handleEndLive = async () => {
    if (!live || !user || endingLive) return;
    setEndingLive(true);
    endedRef.current = true;
    try {
      const blob = await stopRecorderAndGetBlob();
      await endLive(live.id);
      if (blob && blob.size > 0) {
        try {
          const url = await uploadVideoBlob(user.id, blob);
          await setReplay(live.id, url);
        } catch {
          // replay upload is best-effort; the live has still ended correctly
        }
      }
      const analytics = await getLiveAnalytics({ ...live, status: "ended", ended_at: new Date().toISOString() });
      roomRef.current?.disconnect();
      setSummary(analytics);
    } catch {
      endedRef.current = false;
      setEndingLive(false);
    }
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    const p = await createLivePoll(liveId, question, options);
    setPoll(p);
    setPollVotes([]);
    setPollModalOpen(false);
  };

  const handleClosePoll = async () => {
    if (!poll) return;
    await closeLivePoll(poll.id);
    setPoll(null);
    setPollVotes([]);
  };

  const [myVoteIndex, setMyVoteIndex] = useState<number | null>(null);
  useEffect(() => setMyVoteIndex(null), [poll?.id]);
  const handleVote = async (index: number) => {
    if (!user || !poll || myVoteIndex !== null) return;
    setMyVoteIndex(index);
    try {
      await voteLivePoll(poll.id, user.id, index);
      getLivePollVotes(poll.id).then(setPollVotes);
    } catch {
      setMyVoteIndex(null);
    }
  };

  const handleInviteGuest = async (guestId: string) => {
    await inviteLiveGuest(liveId, guestId);
    listLiveGuests(liveId).then(setGuests);
    setInviteModalOpen(false);
  };

  const handleRemoveGuest = async (guestRowId: string) => {
    await removeLiveGuest(guestRowId);
    listLiveGuests(liveId).then(setGuests);
  };

  const handleAcceptInvite = async () => {
    if (!myInvite) return;
    await respondToGuestInvite(myInvite.id, true);
    window.location.reload();
  };

  const handleDeclineInvite = async () => {
    if (!myInvite) return;
    await respondToGuestInvite(myInvite.id, false);
    setMyInvite(null);
  };

  const handleStartBattle = async (opponentLiveId: string) => {
    if (!live) return;
    const m = await createLiveMatch(live.id, opponentLiveId, 180);
    setMatch(m);
    setBattleModalOpen(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: live?.title ?? "VYRO Live", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleReport = async (reason: string, details: string) => {
    if (!user) return;
    await reportLive(liveId, user.id, reason, details);
    setReportModalOpen(false);
  };

  // ---------- render ----------

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-mist" />
      </div>
    );
  }

  if (notFound || !live) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center">
        <p className="font-display text-base font-semibold text-white">This live doesn't exist</p>
        <button onClick={() => navigate("/live")} className="rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white">
          Back to Live
        </button>
      </div>
    );
  }

  if (summary) {
    return <EndSummary live={live} analytics={summary} onDone={() => navigate("/live", { replace: true })} />;
  }

  if (streamEnded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <Avatar name={live.host.name} avatarUrl={live.host.avatar_url} size={64} />
        <p className="font-display text-base font-semibold text-white">{live.host.name}'s live has ended</p>
        {live.replay_ready && live.replay_url ? (
          <button
            onClick={() => navigate(`/live/${live.id}/replay`)}
            className="rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Watch Replay
          </button>
        ) : (
          <p className="text-[12.5px] text-mist">No replay is available for this live.</p>
        )}
        <button onClick={() => navigate("/live")} className="rounded-full chip px-5 py-2.5 text-sm font-medium text-mist">
          Back to Live
        </button>
      </div>
    );
  }

  const gridCount = (localStream ? 1 : 0) + remoteIds.length;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      <div className={`absolute inset-0 grid gap-0.5 ${gridCount > 1 ? "grid-cols-2" : "grid-cols-1"}`} style={{ background: gradientFor(live.id) }}>
        {localStream && (
          <div className="relative h-full w-full overflow-hidden bg-black/40">
            <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={56} />
              </div>
            )}
            {role === "guest" && (
              <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[9.5px] font-bold text-white backdrop-blur">
                CO-HOST
              </span>
            )}
          </div>
        )}
        {remoteIds.map((rid) => (
          <div
            key={rid}
            ref={(el) => {
              if (el) remoteContainers.current.set(rid, el);
            }}
            className="relative h-full w-full overflow-hidden bg-black/40"
          />
        ))}
        {gridCount === 0 && (
          <div className="flex h-full items-center justify-center">
            {connecting ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/70" />
            ) : connectError ? (
              <p className="max-w-[240px] text-center text-[12.5px] text-white/70">{connectError}</p>
            ) : (
              <Avatar name={live.host.name} avatarUrl={live.host.avatar_url} size={72} />
            )}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/80" />

      {match && (
        <div className="absolute left-1/2 top-16 z-10 flex w-[92%] -translate-x-1/2 items-center gap-2 rounded-2xl bg-black/45 p-2.5 backdrop-blur safe-top">
          <Avatar name={live.host.name} avatarUrl={live.host.avatar_url} size={26} />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"
              style={{
                width: `${matchScore.scoreA + matchScore.scoreB === 0 ? 50 : (matchScore.scoreA / (matchScore.scoreA + matchScore.scoreB)) * 100}%`,
              }}
            />
          </div>
          <Avatar name={opponent?.host.name ?? "?"} avatarUrl={opponent?.host.avatar_url} size={26} />
          {opponent && (
            <button onClick={() => navigate(`/live/${opponent.id}`)} className="shrink-0 text-[10px] font-semibold text-white/80">
              View
            </button>
          )}
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between gap-2 px-3 pt-4 safe-top">
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-black/35 py-1 pl-1 pr-3 backdrop-blur">
          <Avatar name={live.host.name} avatarUrl={live.host.avatar_url} size={32} online />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">{live.host.name}</p>
            <p className="flex items-center gap-1 text-[10px] text-white/70">
              <Eye className="h-2.5 w-2.5" /> {viewerCount.toLocaleString()} watching
            </p>
          </div>
          {!isHost && (
            <button
              onClick={handleFollow}
              className={`ml-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                following ? "bg-white/15 text-white" : "grad-primary text-white"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isHost && (
            <button onClick={() => setMenuOpen((m) => !m)} className="rounded-full bg-black/35 p-2 text-white backdrop-blur">
              <MoreVertical className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            onClick={() => (isHost ? handleEndLive() : navigate(-1))}
            className="rounded-full bg-black/35 p-2 text-white backdrop-blur"
          >
            {isHost ? <PhoneOff className="h-4.5 w-4.5" /> : <X className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && !isHost && (
        <div className="absolute right-3 top-16 z-20 w-40 overflow-hidden rounded-2xl glass-strong safe-top">
          <button
            onClick={() => {
              setMenuOpen(false);
              handleShare();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-[12.5px] text-ink"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              setReportModalOpen(true);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-[12.5px] text-rose-400"
          >
            <Flag className="h-3.5 w-3.5" /> Report
          </button>
        </div>
      )}

      {myInvite && myInvite.status === "invited" && (
        <div className="absolute left-1/2 top-24 z-20 w-[88%] -translate-x-1/2 rounded-2xl glass-strong p-4 safe-top">
          <p className="mb-3 text-[13px] text-ink">{live.host.name} invited you to co-host this live.</p>
          <div className="flex gap-2">
            <button onClick={handleDeclineInvite} className="flex-1 rounded-full chip py-2 text-[12.5px] font-medium text-mist">
              Decline
            </button>
            <button onClick={handleAcceptInvite} className="flex-1 rounded-full grad-primary py-2 text-[12.5px] font-semibold text-white">
              Accept
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 bottom-[168px] z-10 flex h-40 flex-col-reverse items-end gap-1 overflow-hidden safe-bottom">
        {floatingHearts.map((h) => (
          <span key={h.id} className="animate-float-up text-2xl">
            {h.emoji}
          </span>
        ))}
      </div>

      <div className="absolute inset-x-3 bottom-[168px] z-10 flex flex-col items-start gap-1 safe-bottom">
        {gifts.map((g) => {
          const catalogItem = giftCatalog.find((c) => c.id === g.gift_key);
          return (
            <div key={g.key} className="animate-gift-in flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur">
              <span className="text-base">{catalogItem?.emoji ?? "🎁"}</span>
              <span className="text-[11.5px] font-medium text-white">
                {g.sender.name} sent {catalogItem?.name ?? "a gift"}
              </span>
            </div>
          );
        })}
      </div>

      {poll && (
        <PollCard
          poll={poll}
          votes={pollVotes}
          myVoteIndex={myVoteIndex}
          isHost={isHost}
          onVote={handleVote}
          onClose={handleClosePoll}
        />
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 safe-bottom">
        <div className="max-h-40 space-y-1.5 overflow-y-auto px-3 pb-2">
          {messages.slice(-30).map((m) => (
            <div key={m.id} className="group flex items-start gap-1.5">
              <p className={`flex-1 rounded-xl px-2.5 py-1.5 text-[12px] ${m.pinned ? "bg-amber-500/25 text-amber-100" : "bg-black/35 text-white"}`}>
                {m.pinned && <Pin className="mr-1 inline h-2.5 w-2.5" />}
                <span className="font-semibold">{m.sender.name}</span> {m.text}
              </p>
              {isHost && (
                <div className="hidden shrink-0 gap-1 group-hover:flex">
                  <button
                    onClick={() => pinLiveMessage(m.id, !m.pinned).then(() => setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x))))}
                    className="rounded-full bg-black/40 p-1 text-white"
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteLiveMessage(m.id).then(() => setMessages((ms) => ms.filter((x) => x.id !== m.id)))}
                    className="rounded-full bg-black/40 p-1 text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() =>
                      blockLiveViewer(liveId, m.sender.id).then(() =>
                        setMessages((ms) => ms.filter((x) => x.sender.id !== m.sender.id))
                      )
                    }
                    className="rounded-full bg-black/40 p-1 text-rose-300"
                  >
                    <Ban className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex items-center gap-2 px-3 pb-3">
          <input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            placeholder="Say something…"
            className="min-w-0 flex-1 rounded-full bg-black/35 px-4 py-2.5 text-[13px] text-white placeholder:text-white/50 outline-none backdrop-blur"
          />
          <IconBtn onClick={handleSendChat}>
            <Send className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={handleReact}>
            <Heart className="h-4 w-4" />
          </IconBtn>
          {!isHost && (
            <IconBtn onClick={() => setGiftPickerOpen(true)} active>
              <Gift className="h-4 w-4" />
            </IconBtn>
          )}
          {isHost && (
            <>
              <IconBtn onClick={() => setGuestsPanelOpen(true)}>
                <Users className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => setPollModalOpen(true)}>
                <BarChart3 className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => setBattleModalOpen(true)}>
                <Swords className="h-4 w-4" />
              </IconBtn>
            </>
          )}
        </div>

        {isHost && (
          <div className="flex items-center justify-center gap-4 pb-4">
            <SmallCtrl onClick={toggleMic} active={!micOn}>
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </SmallCtrl>
            <SmallCtrl onClick={toggleCam} active={!camOn}>
              {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </SmallCtrl>
            <SmallCtrl onClick={flipCamera}>
              <SwitchCamera className="h-4 w-4" />
            </SmallCtrl>
          </div>
        )}
      </div>

      {giftPickerOpen && live && (
        <GiftPicker
          receiverId={live.host_id}
          receiverName={live.host.name}
          myCoins={profile?.coins ?? 0}
          liveId={live.id}
          onClose={() => setGiftPickerOpen(false)}
          onSent={handleGiftSent}
        />
      )}

      {pollModalOpen && <PollCreateModal onClose={() => setPollModalOpen(false)} onCreate={handleCreatePoll} />}

      {guestsPanelOpen && (
        <GuestsPanel
          guests={guests}
          onClose={() => setGuestsPanelOpen(false)}
          onInvite={() => setInviteModalOpen(true)}
          onRemove={handleRemoveGuest}
        />
      )}

      {inviteModalOpen && user && (
        <InviteGuestModal currentUserId={user.id} onClose={() => setInviteModalOpen(false)} onInvite={handleInviteGuest} />
      )}

      {battleModalOpen && user && live && (
        <BattlePickerModal myUserId={user.id} myLiveId={live.id} onClose={() => setBattleModalOpen(false)} onPick={handleStartBattle} />
      )}

      {reportModalOpen && <ReportModal onClose={() => setReportModalOpen(false)} onSubmit={handleReport} />}
    </div>
  );
}

function IconBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full backdrop-blur ${
        active ? "grad-primary text-white" : "bg-black/35 text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SmallCtrl({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur active:scale-95 ${
        active ? "bg-white text-void" : "bg-black/35 text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PollCard({
  poll,
  votes,
  myVoteIndex,
  isHost,
  onVote,
  onClose,
}: {
  poll: LivePoll;
  votes: { option_index: number; user_id: string }[];
  myVoteIndex: number | null;
  isHost: boolean;
  onVote: (index: number) => void;
  onClose: () => void;
}) {
  const total = votes.length;
  return (
    <div className="absolute left-1/2 top-32 z-10 w-[88%] -translate-x-1/2 rounded-2xl glass-strong p-4 safe-top">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink">{poll.question}</p>
        {isHost && (
          <button onClick={onClose} className="text-[11px] font-medium text-mist">
            End
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const count = votes.filter((v) => v.option_index === i).length;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          const voted = myVoteIndex !== null;
          return (
            <button
              key={i}
              onClick={() => onVote(i)}
              disabled={voted}
              className="relative w-full overflow-hidden rounded-xl bg-white/10 px-3 py-2 text-left text-[12.5px] text-ink"
            >
              {voted && (
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/40 to-fuchsia-500/40"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span className={myVoteIndex === i ? "font-semibold" : ""}>{opt}</span>
                {voted && <span className="text-[11px] text-mist">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PollCreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (q: string, opts: string[]) => Promise<void> }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validOptions = options.map((o) => o.trim()).filter(Boolean);

  const submit = async () => {
    if (!question.trim() || validOptions.length < 2 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(question.trim(), validOptions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the poll.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 font-display text-base font-semibold text-ink">Create a Poll</p>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your viewers something…"
          className="mb-3 w-full rounded-xl chip px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-mist/60"
        />
        {options.map((opt, i) => (
          <input
            key={i}
            value={opt}
            onChange={(e) => setOptions((os) => os.map((o, idx) => (idx === i ? e.target.value : o)))}
            placeholder={`Option ${i + 1}`}
            className="mb-2 w-full rounded-xl chip px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-mist/60"
          />
        ))}
        {options.length < 4 && (
          <button onClick={() => setOptions((os) => [...os, ""])} className="mb-3 text-[12px] font-medium text-mist">
            + Add option
          </button>
        )}
        {error && <p className="mb-2 text-[12px] text-rose-400">{error}</p>}
        <button
          onClick={submit}
          disabled={!question.trim() || validOptions.length < 2 || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full grad-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Start Poll
        </button>
      </div>
    </div>
  );
}

function GuestsPanel({
  guests,
  onClose,
  onInvite,
  onRemove,
}: {
  guests: LiveGuest[];
  onClose: () => void;
  onInvite: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink">Co-hosts</p>
          <button onClick={onInvite} className="flex items-center gap-1 rounded-full grad-primary px-3 py-1.5 text-[12px] font-semibold text-white">
            <UserPlus className="h-3.5 w-3.5" /> Invite
          </button>
        </div>
        {guests.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-mist">No co-hosts yet.</p>
        ) : (
          <div className="space-y-2">
            {guests.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-2xl glass-card p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={g.guest.name} avatarUrl={g.guest.avatar_url} size={36} />
                  <div>
                    <p className="text-[13px] font-medium text-ink">{g.guest.name}</p>
                    <p className="text-[11px] text-mist capitalize">{g.status}</p>
                  </div>
                </div>
                <button onClick={() => onRemove(g.id)} className="rounded-full chip px-3 py-1.5 text-[11.5px] font-medium text-rose-400">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteGuestModal({
  currentUserId,
  onClose,
  onInvite,
}: {
  currentUserId: string;
  onClose: () => void;
  onInvite: (guestId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      searchPeopleAndPosts(currentUserId, query).then((r) => setResults(r.people));
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  const handleInvite = async (id: string) => {
    setInviting(id);
    try {
      await onInvite(id);
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 font-display text-base font-semibold text-ink">Invite a Co-host</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          className="mb-3 w-full rounded-xl chip px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-mist/60"
        />
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {results.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl glass-card p-3">
              <div className="flex items-center gap-2.5">
                <Avatar name={p.name} avatarUrl={p.avatar_url} size={34} />
                <p className="text-[13px] font-medium text-ink">{p.name}</p>
              </div>
              <button
                onClick={() => handleInvite(p.id)}
                disabled={inviting === p.id}
                className="rounded-full grad-primary px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
              >
                {inviting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Invite"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BattlePickerModal({
  myUserId,
  myLiveId,
  onClose,
  onPick,
}: {
  myUserId: string;
  myLiveId: string;
  onClose: () => void;
  onPick: (liveId: string) => Promise<void>;
}) {
  const [candidates, setCandidates] = useState<LiveSessionWithHost[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    listLiveNow(myUserId).then((all) => setCandidates(all.filter((l) => l.id !== myLiveId)));
  }, [myUserId, myLiveId]);

  const handlePick = async (id: string) => {
    setStarting(id);
    try {
      await onPick(id);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 font-display text-base font-semibold text-ink">Start a Battle</p>
        {candidates === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-mist">No other creators are live right now.</p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl glass-card p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.host.name} avatarUrl={c.host.avatar_url} size={34} />
                  <div>
                    <p className="text-[13px] font-medium text-ink">{c.host.name}</p>
                    <p className="text-[11px] text-mist">{c.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePick(c.id)}
                  disabled={starting === c.id}
                  className="rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
                >
                  {starting === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Battle"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string, details: string) => Promise<void> }) {
  const reasons = ["Nudity or sexual content", "Violence", "Harassment", "Spam", "Hate speech", "Other"];
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(reason, details);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 font-display text-base font-semibold text-ink">Report this live</p>
        <div className="mb-3 space-y-1.5">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full rounded-xl px-3.5 py-2.5 text-left text-[12.5px] ${reason === r ? "grad-purple-blue text-white" : "chip text-mist"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Additional details (optional)"
          rows={2}
          className="mb-3 w-full resize-none rounded-xl chip px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-mist/60"
        />
        <button
          onClick={submit}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit Report
        </button>
      </div>
    </div>
  );
}

function EndSummary({ live, analytics, onDone }: { live: LiveSessionWithHost; analytics: LiveAnalytics; onDone: () => void }) {
  const mm = String(Math.floor(analytics.durationSeconds / 60)).padStart(2, "0");
  const ss = String(analytics.durationSeconds % 60).padStart(2, "0");
  const avgMm = String(Math.floor(analytics.avgWatchSeconds / 60)).padStart(2, "0");
  const avgSs = String(analytics.avgWatchSeconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black px-6 text-center safe-top safe-bottom">
      <Avatar name={live.host.name} avatarUrl={live.host.avatar_url} size={64} ring="live" />
      <div>
        <p className="font-display text-lg font-bold text-white">You're offline</p>
        <p className="text-[12.5px] text-mist">{live.title}</p>
      </div>
      <div className="grid w-full max-w-[320px] grid-cols-2 gap-3">
        <Stat label="Duration" value={`${mm}:${ss}`} />
        <Stat label="Peak Viewers" value={analytics.peakViewers.toLocaleString()} />
        <Stat label="Unique Viewers" value={analytics.uniqueViewers.toLocaleString()} />
        <Stat label="Avg. Watch Time" value={`${avgMm}:${avgSs}`} />
        <Stat label="Gift Coins" value={analytics.totalGiftCoins.toLocaleString()} />
      </div>
      <button onClick={onDone} className="w-full max-w-[320px] rounded-full grad-primary py-3.5 text-sm font-semibold text-white">
        Done
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl glass-card p-3.5">
      <p className="font-display text-lg font-bold text-ink">{value}</p>
      <p className="text-[11px] text-mist">{label}</p>
    </div>
  );
}
