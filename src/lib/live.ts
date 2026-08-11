import { Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrackPublication } from "livekit-client";
import { supabase } from "./supabase";

export type LiveKitCreds = { token: string; url: string; role: "host" | "guest" | "viewer" };

export async function getLiveKitCreds(liveId: string): Promise<LiveKitCreds> {
  const { data, error } = await supabase.functions.invoke("livekit-token", { body: { liveId } });
  if (error) throw new Error(error.message ?? "Couldn't connect to the live stream.");
  if (data?.error) throw new Error(data.error);
  return data as LiveKitCreds;
}

export async function connectToLiveRoom(
  liveId: string,
  opts: { publish: boolean; onTrack?: (track: MediaStreamTrack, participant: RemoteParticipant) => void }
): Promise<{ room: Room; localStream: MediaStream | null }> {
  const creds = await getLiveKitCreds(liveId);
  const room = new Room({ adaptiveStream: true, dynacast: true });

  if (opts.onTrack) {
    room.on(
      RoomEvent.TrackSubscribed,
      (track: Track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        opts.onTrack?.(track.mediaStreamTrack, participant);
      }
    );
  }

  await room.connect(creds.url, creds.token);

  let localStream: MediaStream | null = null;
  if (opts.publish) {
    await room.localParticipant.enableCameraAndMicrophone();
    const videoPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    localStream = videoPub?.track?.mediaStream ?? null;
  }

  return { room, localStream };
}

// ---------- presence (real, live viewer count) ----------

export type LivePresenceHandle = {
  getCount: () => number;
  channel: ReturnType<typeof supabase.channel>;
  unsubscribe: () => void;
};

export function joinLivePresence(
  liveId: string,
  userId: string,
  role: "host" | "viewer",
  onChange: (count: number) => void
): LivePresenceHandle {
  const channel = supabase.channel(`live-presence:${liveId}`, {
    config: { presence: { key: userId } },
  });

  let count = 0;

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      count = Object.keys(state).length;
      onChange(count);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ role, online_at: new Date().toISOString() });
      }
    });

  return {
    getCount: () => count,
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ---------- reactions (ephemeral, aggregated broadcast) ----------

export function joinLiveReactions(liveId: string, onReaction: (emoji: string, count: number) => void) {
  const channel = supabase
    .channel(`live-reactions:${liveId}`)
    .on("broadcast", { event: "reaction" }, ({ payload }) => onReaction(payload.emoji, payload.count ?? 1))
    .subscribe();

  return {
    send: (emoji: string) => channel.send({ type: "broadcast", event: "reaction", payload: { emoji, count: 1 } }),
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

