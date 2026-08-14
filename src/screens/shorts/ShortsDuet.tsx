import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, X, Loader2, Volume2, VolumeX, RefreshCw, SkipForward } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { getPostBrief, type PostBrief } from "../../lib/api";
import { createEmptyProject, DEFAULT_FILTER, type RemixType, type ShortClip } from "../../lib/shorts/types";
import { saveProject, putBlob } from "../../lib/shorts/db";
import { probeVideo, formatDuration } from "../../lib/shorts/media";

const MAX_LIVE_SEC = 60;
const STITCH_LENGTH_OPTIONS = [3, 5, 8];

type Phase = "idle" | "source" | "live";

export function ShortsDuet() {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const mode: RemixType = searchParams.get("mode") === "stitch" ? "stitch" : "duet";
  const navigate = useNavigate();

  const [source, setSource] = useState<PostBrief | null | undefined>(undefined);
  const [stitchLenSec, setStitchLenSec] = useState(5);
  const [originalSoundOn, setOriginalSoundOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<{ blobKey: string; thumbnail: string; durationSec: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const camVideoRef = useRef<HTMLVideoElement>(null);
  const srcVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const srcGainRef = useRef<GainNode | null>(null);
  const micNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const coverImgRef = useRef<HTMLImageElement | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const phaseStartRef = useRef(Date.now());
  const sourceStartedRef = useRef(false);

  useEffect(() => {
    if (!postId) return;
    getPostBrief(postId).then(setSource).catch(() => setSource(null));
  }, [postId]);

  useEffect(() => {
    if (!source?.cover_url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      coverImgRef.current = img;
    };
    img.src = source.cover_url;
  }, [source]);

  // ---------- camera setup ----------
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        camStreamRef.current = stream;
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = stream;
          camVideoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Camera access denied. Allow camera and microphone permissions to film.");
      });
    return () => {
      cancelled = true;
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  // ---------- audio graph (set up once, tied to the source <video> element) ----------
  useEffect(() => {
    if (!source || audioCtxRef.current) return;
    const srcVideoEl = srcVideoRef.current;
    if (!srcVideoEl) return;
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const srcNode = ctx.createMediaElementSource(srcVideoEl);
    const srcGain = ctx.createGain();
    srcGain.gain.value = 0;
    srcNode.connect(srcGain);
    srcGain.connect(dest);
    srcGain.connect(ctx.destination); // let the filmmaker hear the original while recording
    audioCtxRef.current = ctx;
    destRef.current = dest;
    srcGainRef.current = srcGain;
    return () => {
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [source]);

  // ---------- draw loop ----------
  useEffect(() => {
    if (!ready || !source) return;
    const canvas = canvasRef.current;
    const camVideo = camVideoRef.current;
    const srcVideo = srcVideoRef.current;
    if (!canvas || !camVideo || !srcVideo) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1920;

    const drawCover = (media: CanvasImageSource, mw: number, mh: number, dx: number, dy: number, dw: number, dh: number, mirror: boolean) => {
      if (mw <= 0 || mh <= 0) return;
      const targetRatio = dw / dh;
      const srcRatio = mw / mh;
      let sx = 0, sy = 0, sw = mw, sh = mh;
      if (srcRatio > targetRatio) {
        sw = mh * targetRatio;
        sx = (mw - sw) / 2;
      } else {
        sh = mw / targetRatio;
        sy = (mh - sh) / 2;
      }
      ctx.save();
      if (mirror) {
        ctx.translate(dx + dw, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(media, sx, sy, sw, sh, 0, 0, dw, dh);
      } else {
        ctx.drawImage(media, sx, sy, sw, sh, dx, dy, dw, dh);
      }
      ctx.restore();
    };

    const drawSource = (dx: number, dy: number, dw: number, dh: number) => {
      if (sourceStartedRef.current && srcVideo.videoWidth > 0) {
        drawCover(srcVideo, srcVideo.videoWidth, srcVideo.videoHeight, dx, dy, dw, dh, false);
      } else if (coverImgRef.current) {
        const img = coverImgRef.current;
        drawCover(img, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh, false);
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(dx, dy, dw, dh);
      }
    };

    const draw = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (mode === "duet") {
        drawSource(0, 0, canvas.width / 2, canvas.height);
        drawCover(camVideo, camVideo.videoWidth, camVideo.videoHeight, canvas.width / 2, 0, canvas.width / 2, canvas.height, facingMode === "user");
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
      } else if (phaseRef.current === "live") {
        drawCover(camVideo, camVideo.videoWidth, camVideo.videoHeight, 0, 0, canvas.width, canvas.height, facingMode === "user");
      } else {
        drawSource(0, 0, canvas.width, canvas.height);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, source, mode, facingMode]);

  // ---------- recording timer + stitch phase auto-transition ----------
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const secs = (Date.now() - phaseStartRef.current) / 1000;
      setElapsed(secs);
      if (phaseRef.current === "source") {
        const srcVideoEl = srcVideoRef.current;
        if (secs >= stitchLenSec || srcVideoEl?.ended) transitionToLive();
      } else if (secs >= MAX_LIVE_SEC) {
        stopRecording();
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const transitionToLive = () => {
    const srcVideoEl = srcVideoRef.current;
    srcVideoEl?.pause();
    if (srcGainRef.current) srcGainRef.current.gain.value = 0;
    if (micGainRef.current) micGainRef.current.gain.value = 1;
    phaseRef.current = "live";
    setPhase("live");
    phaseStartRef.current = Date.now();
    setElapsed(0);
  };

  const toggleOriginalSound = () => {
    setOriginalSoundOn((v) => {
      const next = !v;
      if (srcGainRef.current && mode === "duet") srcGainRef.current.gain.value = next ? 0.7 : 0;
      return next;
    });
  };

  const makeThumbnail = (blob: Blob): Promise<string> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const v = document.createElement("video");
      v.src = url;
      v.muted = true;
      v.onloadeddata = () => {
        v.currentTime = 0.05;
      };
      v.onseeked = () => {
        const c = document.createElement("canvas");
        c.width = 90;
        c.height = 160;
        const cx = c.getContext("2d");
        if (cx) cx.drawImage(v, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.7));
        URL.revokeObjectURL(url);
      };
    });

  const startRecording = async () => {
    const canvas = canvasRef.current;
    const camStream = camStreamRef.current;
    const srcVideoEl = srcVideoRef.current;
    const ctx = audioCtxRef.current;
    const dest = destRef.current;
    const srcGain = srcGainRef.current;
    if (!canvas || !camStream || !srcVideoEl || !ctx || !dest || !srcGain || !source) return;
    setError(null);
    await ctx.resume().catch(() => {});

    const micNode = ctx.createMediaStreamSource(camStream);
    const micGain = ctx.createGain();
    micNode.connect(micGain).connect(dest);
    micNodeRef.current = micNode;
    micGainRef.current = micGain;

    try {
      if (mode === "stitch") {
        phaseRef.current = "source";
        setPhase("source");
        srcGain.gain.value = 1;
        micGain.gain.value = 0;
        srcVideoEl.loop = false;
      } else {
        phaseRef.current = "live";
        setPhase("live");
        srcGain.gain.value = originalSoundOn ? 0.7 : 0;
        micGain.gain.value = 1;
        srcVideoEl.loop = true;
      }
      srcVideoEl.currentTime = 0;
      await srcVideoEl.play();
      sourceStartedRef.current = true;
    } catch {
      setError("Couldn't play the original video. Try again.");
      return;
    }

    let combined: MediaStream;
    try {
      const canvasStream = canvas.captureStream(30);
      combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    } catch {
      setError("This video can't be used for Duet/Stitch on this browser.");
      return;
    }

    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp8,opus" });
    } catch {
      setError("Recording isn't supported in this browser.");
      return;
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(250);
    recorderRef.current = recorder;
    phaseStartRef.current = Date.now();
    setElapsed(0);
    setRecording(true);
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecording(false);

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    micNodeRef.current?.disconnect();
    micGainRef.current?.disconnect();
    micNodeRef.current = null;

    const srcVideoEl = srcVideoRef.current;
    srcVideoEl?.pause();
    if (srcVideoEl) srcVideoEl.currentTime = 0;
    if (srcGainRef.current) srcGainRef.current.gain.value = 0;
    sourceStartedRef.current = false;
    phaseRef.current = "idle";
    setPhase("idle");
    setElapsed(0);

    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size < 500) return;

    setSaving(true);
    try {
      const probe = await probeVideo(blob).catch(() => ({ durationSec: 1, width: 0, height: 0, orientation: "portrait" as const }));
      const thumbnail = await makeThumbnail(blob);
      const blobKey = await putBlob(blob);
      setClip({ blobKey, thumbnail, durationSec: Math.max(0.5, probe.durationSec) });
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => setClip(null);

  const handleDone = async () => {
    if (!clip || !source || saving) return;
    setSaving(true);
    try {
      const project = createEmptyProject();
      const shortClip: ShortClip = {
        id: crypto.randomUUID(),
        kind: "video",
        blobKey: clip.blobKey,
        sourceDurationSec: clip.durationSec,
        trimStartSec: 0,
        trimEndSec: clip.durationSec,
        speed: 1,
        volume: 1,
        muted: false,
        filter: DEFAULT_FILTER,
        photoDurationSec: 3,
        photoMotion: "none",
        fitMode: "crop",
      };
      project.clips = [shortClip];
      project.remix = { type: mode, sourcePostId: source.id };
      await saveProject(project);
      navigate(`/create/reel/edit/${project.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    srcVideoRef.current?.pause();
    navigate(-1);
  };

  if (source === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (source === null) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black px-8 text-center">
        <p className="text-[13px] text-white/70">This video couldn't be found.</p>
        <button onClick={() => navigate(-1)} className="rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={camVideoRef} playsInline muted className="hidden" />
      <video
        ref={srcVideoRef}
        src={source.video_url}
        crossOrigin="anonymous"
        playsInline
        preload="auto"
        className="hidden"
        onError={() => setError("Couldn't load the original video for filming.")}
      />

      <div className="relative flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="h-full w-full object-cover" />

        {clip && (
          <img src={clip.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-8 text-center">
            <p className="text-[13px] text-white/80">{error}</p>
            <button onClick={handleExit} className="rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white">
              Go Back
            </button>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4 safe-top">
          <button onClick={handleExit} className="rounded-full bg-black/35 p-2.5 text-white backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 rounded-full bg-black/35 py-1.5 pl-1.5 pr-3 backdrop-blur">
            <Avatar name={source.author.name} avatarUrl={source.author.avatar_url} size={22} />
            <span className="text-[11px] font-medium text-white">
              {mode === "duet" ? "Duet" : "Stitch"} with @{source.author.username}
            </span>
          </div>
          {mode === "duet" && !recording && (
            <button onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))} className="rounded-full bg-black/35 p-2.5 text-white backdrop-blur">
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {recording && (
          <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {phase === "source" ? `Playing original… ${formatDuration(elapsed)}` : `Recording your part… ${formatDuration(elapsed)}`}
          </div>
        )}

        {mode === "stitch" && !recording && !clip && (
          <div className="absolute inset-x-0 bottom-[168px] z-10 flex items-center justify-center gap-2">
            {STITCH_LENGTH_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStitchLenSec(s)}
                className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-medium backdrop-blur ${
                  stitchLenSec === s ? "grad-purple-blue text-white" : "bg-black/40 text-white/80"
                }`}
              >
                {s}s clip
              </button>
            ))}
          </div>
        )}

        {mode === "stitch" && recording && phase === "source" && (
          <div className="absolute inset-x-0 bottom-[168px] z-10 flex justify-center">
            <button
              onClick={transitionToLive}
              className="flex items-center gap-1.5 rounded-full bg-black/40 px-3.5 py-1.5 text-[11.5px] font-medium text-white backdrop-blur"
            >
              <SkipForward className="h-3.5 w-3.5" /> Skip to my part
            </button>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 safe-bottom">
          {mode === "duet" && !clip && (
            <div className="flex items-center justify-center pb-3">
              <button
                onClick={toggleOriginalSound}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-medium backdrop-blur ${
                  originalSoundOn ? "grad-purple-blue text-white" : "bg-black/40 text-white/80"
                }`}
              >
                {originalSoundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                Original sound
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-8 pb-8">
            {!clip ? (
              <button
                onClick={() => (recording ? stopRecording() : startRecording())}
                disabled={!ready || !!error || saving}
                className="relative flex h-20 w-20 items-center justify-center disabled:opacity-40"
              >
                <span className={`absolute inset-0 rounded-full border-4 ${recording ? "border-rose-500 animate-pulse" : "border-white"}`} />
                <span className={`transition-all ${recording ? "h-8 w-8 rounded-lg bg-rose-500" : "h-16 w-16 rounded-full bg-rose-500"}`} />
              </button>
            ) : (
              <>
                <button onClick={handleRetake} disabled={saving} className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur disabled:opacity-40">
                  <X className="h-6 w-6" />
                </button>
                <button
                  onClick={handleDone}
                  disabled={saving}
                  className="flex h-16 w-16 items-center justify-center rounded-full grad-primary text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
