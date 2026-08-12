import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Zap,
  ZapOff,
  RefreshCw,
  Settings,
  Sparkles,
  Timer as TimerIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Captions,
  X,
  Check,
} from "lucide-react";
import { createEmptyProject, clipDuration, type ShortClip, type CaptionSegment } from "../../lib/shorts/types";
import { saveProject, putBlob } from "../../lib/shorts/db";
import { filterPresets, applyPreset, filterToCss, drawVignette, drawGrain } from "../../lib/shorts/filters";
import { formatDuration } from "../../lib/shorts/media";
import { isLiveCaptionSupported, startLiveTranscription } from "../../lib/shorts/speech";

const DURATION_OPTIONS = [15, 30, 60, 180];
const TIMER_OPTIONS = [0, 3, 10];

type ClipThumb = ShortClip & { thumbnail: string };

export function ShortsCamera() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [mode, setMode] = useState<"video" | "photo">("video");
  const [filterKey, setFilterKey] = useState("natural");
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [maxDurationSec, setMaxDurationSec] = useState(60);
  const [timerSec, setTimerSec] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clips, setClips] = useState<ClipThumb[]>([]);
  const [saving, setSaving] = useState(false);

  const speechSupported = isLiveCaptionSupported();
  const [captionsOn, setCaptionsOn] = useState(false);
  const transcriptionRef = useRef<{ stop: () => void } | null>(null);
  const capturedSegmentsRef = useRef<{ text: string; atSec: number }[]>([]);
  const allCaptionsRef = useRef<CaptionSegment[]>([]);

  const usedSec = clips.reduce((sum, c) => sum + clipDuration(c), 0);
  const remainingSec = Math.max(0, maxDurationSec - usedSec - elapsed);

  // ---------- camera setup ----------
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setCameraError(null);

    streamRef.current?.getTracks().forEach((t) => t.stop());

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTorchSupported(!!caps?.torch);
        setTorchOn(false);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setCameraError("Camera access denied. Allow camera and microphone permissions to record.");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  // ---------- draw loop (canvas is both the live preview AND the recorded source) ----------
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1920;
    const filter = applyPreset(filterKey);

    const draw = () => {
      if (video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const targetRatio = canvas.width / canvas.height;
        const srcRatio = vw / vh;
        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (srcRatio > targetRatio) {
          sw = vh * targetRatio;
          sx = (vw - sw) / 2;
        } else {
          sh = vw / targetRatio;
          sy = (vh - sh) / 2;
        }
        // digital zoom: shrink the source rect further, centered
        if (zoom > 1) {
          const zw = sw / zoom;
          const zh = sh / zoom;
          sx += (sw - zw) / 2;
          sy += (sh - zh) / 2;
          sw = zw;
          sh = zh;
        }
        ctx.save();
        ctx.filter = filterToCss(filter);
        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.filter = "none";
        drawVignette(ctx, canvas.width, canvas.height, filter.vignette);
        drawGrain(ctx, canvas.width, canvas.height, filter.grain);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, filterKey, zoom, facingMode]);

  // ---------- elapsed timer while recording ----------
  useEffect(() => {
    if (!recording || paused) return;
    const start = Date.now() - elapsed * 1000;
    const t = setInterval(() => {
      const next = (Date.now() - start) / 1000;
      setElapsed(next);
      if (usedSec + next >= maxDurationSec) {
        stopRecording();
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, paused]);

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

  const beginCountdownThen = (action: () => void) => {
    if (timerSec === 0) {
      action();
      return;
    }
    setCountdown(timerSec);
    const tick = (n: number) => {
      if (n <= 0) {
        setCountdown(null);
        action();
        return;
      }
      setTimeout(() => {
        setCountdown(n - 1);
        tick(n - 1);
      }, 1000);
    };
    tick(timerSec);
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    const camStream = streamRef.current;
    if (!canvas || !camStream || remainingSec <= 0) return;
    const canvasStream = canvas.captureStream(30);
    const audioTrack = camStream.getAudioTracks()[0];
    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...(audioTrack ? [audioTrack] : [])]);
    chunksRef.current = [];
    const recorder = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp8,opus" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(250);
    recorderRef.current = recorder;
    setElapsed(0);
    setRecording(true);
    setPaused(false);

    if (captionsOn && speechSupported) {
      capturedSegmentsRef.current = [];
      transcriptionRef.current = startLiveTranscription((seg) => capturedSegmentsRef.current.push(seg));
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecording(false);
    setPaused(false);
    transcriptionRef.current?.stop();
    transcriptionRef.current = null;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    setElapsed(0);
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size < 500) return;

    if (capturedSegmentsRef.current.length > 0) {
      const baseOffset = clips.reduce((sum, c) => sum + clipDuration(c), 0);
      let cursor = 0;
      for (const seg of capturedSegmentsRef.current) {
        allCaptionsRef.current.push({
          id: crypto.randomUUID(),
          text: seg.text,
          startSec: baseOffset + cursor,
          endSec: baseOffset + seg.atSec,
        });
        cursor = seg.atSec;
      }
      capturedSegmentsRef.current = [];
    }

    const thumbnail = await makeThumbnail(blob);
    const blobKey = await putBlob(blob);
    const clip: ClipThumb = {
      id: crypto.randomUUID(),
      kind: "video",
      blobKey,
      sourceDurationSec: elapsed || 0.5,
      trimStartSec: 0,
      trimEndSec: elapsed || 0.5,
      speed: 1,
      volume: 1,
      muted: false,
      filter: applyPreset(filterKey),
      photoDurationSec: 3,
      photoMotion: "none",
      fitMode: "crop",
      thumbnail,
    };
    setClips((c) => [...c, clip]);
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const blobKey = await putBlob(blob);
      const thumbnail = canvas.toDataURL("image/jpeg", 0.6);
      const clip: ClipThumb = {
        id: crypto.randomUUID(),
        kind: "photo",
        blobKey,
        sourceDurationSec: 3,
        trimStartSec: 0,
        trimEndSec: 3,
        speed: 1,
        volume: 1,
        muted: true,
        filter: applyPreset(filterKey),
        photoDurationSec: 3,
        photoMotion: "zoom-in",
        fitMode: "crop",
        thumbnail,
      };
      setClips((c) => [...c, clip]);
    }, "image/jpeg", 0.85);
  };

  const handleCapturePress = () => {
    if (mode === "photo") {
      beginCountdownThen(takePhoto);
      return;
    }
    if (recording) {
      stopRecording();
    } else {
      beginCountdownThen(startRecording);
    }
  };

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (paused) {
      recorder.resume();
      setPaused(false);
    } else {
      recorder.pause();
      setPaused(true);
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet] });
      setTorchOn((v) => !v);
    } catch {
      // torch toggle not supported on this device/track — control stays disabled
    }
  };

  const removeClip = (id: string) => setClips((c) => c.filter((x) => x.id !== id));

  const handleDone = async () => {
    if (clips.length === 0 || saving) return;
    setSaving(true);
    try {
      const project = createEmptyProject();
      if (projectId) project.id = projectId;
      project.clips = clips.map(({ thumbnail: _thumbnail, ...clip }) => clip);
      project.captions = allCaptionsRef.current;
      project.captionsEnabled = allCaptionsRef.current.length > 0;
      await saveProject(project);
      navigate(`/create/reel/edit/${project.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="hidden" />
      <div className="relative flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="h-full w-full object-cover" />

        {!ready && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-8 text-center">
            <p className="text-[13px] text-white/80">{cameraError}</p>
            <button onClick={handleExit} className="rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white">
              Go Back
            </button>
          </div>
        )}

        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="font-display text-8xl font-bold text-white drop-shadow-lg">{countdown}</span>
          </div>
        )}

        {/* top controls */}
        {!recording && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4 safe-top">
            <button onClick={handleExit} className="rounded-full bg-black/35 p-2.5 text-white backdrop-blur">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {torchSupported && (
                <button onClick={toggleTorch} className="rounded-full bg-black/35 p-2.5 text-white backdrop-blur">
                  {torchOn ? <Zap className="h-4.5 w-4.5" /> : <ZapOff className="h-4.5 w-4.5" />}
                </button>
              )}
              <button
                onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
                className="rounded-full bg-black/35 p-2.5 text-white backdrop-blur"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
              <button onClick={() => setShowSettings(true)} className="rounded-full bg-black/35 p-2.5 text-white backdrop-blur">
                <Settings className="h-4.5 w-4.5" />
              </button>
              {speechSupported && mode === "video" && (
                <button
                  onClick={() => setCaptionsOn((v) => !v)}
                  className={`rounded-full p-2.5 backdrop-blur ${captionsOn ? "grad-primary text-white" : "bg-black/35 text-white"}`}
                  title="Live captions while recording"
                >
                  <Captions className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* recording progress ring context */}
        {recording && (
          <div className="absolute left-1/2 top-6 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur safe-top">
            {formatDuration(elapsed)} / {formatDuration(maxDurationSec - usedSec)}
          </div>
        )}

        {/* clip strip */}
        {!recording && clips.length > 0 && (
          <div className="no-scrollbar absolute inset-x-0 bottom-[168px] z-10 flex gap-1.5 overflow-x-auto px-4">
            {clips.map((c, i) => (
              <div key={c.id} className="group relative h-16 w-11 shrink-0 overflow-hidden rounded-lg border border-white/25">
                <img src={c.thumbnail} className="h-full w-full object-cover" alt={`Clip ${i + 1}`} />
                <button
                  onClick={() => removeClip(c.id)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* filter strip */}
        {showFilters && !recording && (
          <div className="no-scrollbar absolute inset-x-0 bottom-[168px] z-10 flex gap-2 overflow-x-auto px-4">
            {filterPresets.map((p) => (
              <button
                key={p.key}
                onClick={() => setFilterKey(p.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11.5px] font-medium backdrop-blur ${
                  filterKey === p.key ? "grad-purple-blue text-white" : "bg-black/40 text-white/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* bottom controls */}
        <div className="absolute inset-x-0 bottom-0 z-10 safe-bottom">
          {!recording && (
            <div className="flex items-center justify-center gap-6 pb-3">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex flex-col items-center gap-1 text-white ${showFilters ? "opacity-100" : "opacity-70"}`}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-[10px]">Effects</span>
              </button>
              <button
                onClick={() => setTimerSec((t) => TIMER_OPTIONS[(TIMER_OPTIONS.indexOf(t) + 1) % TIMER_OPTIONS.length])}
                className="flex flex-col items-center gap-1 text-white opacity-70"
              >
                <TimerIcon className="h-5 w-5" />
                <span className="text-[10px]">{timerSec === 0 ? "Timer" : `${timerSec}s`}</span>
              </button>
              <button
                onClick={() => setMode((m) => (m === "video" ? "photo" : "video"))}
                className="flex flex-col items-center gap-1 text-white opacity-70"
              >
                {mode === "video" ? <ImageIcon className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
                <span className="text-[10px]">{mode === "video" ? "Photo" : "Video"}</span>
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-16 accent-fuchsia-500"
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-8 pb-8">
            {recording && (
              <button onClick={togglePause} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                {paused ? <div className="h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-white" /> : <div className="h-3.5 w-3.5 rounded-sm bg-white" />}
              </button>
            )}

            <button onClick={handleCapturePress} disabled={remainingSec <= 0 && !recording} className="relative flex h-20 w-20 items-center justify-center">
              <span
                className={`absolute inset-0 rounded-full border-4 ${recording ? "border-rose-500" : "border-white"} ${
                  recording ? "animate-pulse" : ""
                }`}
              />
              <span className={`transition-all ${recording ? "h-8 w-8 rounded-lg bg-rose-500" : "h-16 w-16 rounded-full bg-rose-500"}`} />
            </button>

            {!recording && clips.length > 0 && (
              <button
                onClick={handleDone}
                disabled={saving}
                className="flex h-11 w-11 items-center justify-center rounded-full grad-primary text-white disabled:opacity-50"
              >
                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 font-display text-base font-semibold text-ink">Recording Settings</p>
            <p className="mb-2 text-[12px] font-medium text-mist">Max duration</p>
            <div className="mb-4 flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setMaxDurationSec(d)}
                  className={`flex-1 rounded-full py-2 text-[12.5px] font-medium ${
                    maxDurationSec === d ? "grad-primary text-white" : "chip text-mist"
                  }`}
                >
                  {d < 60 ? `${d}s` : `${d / 60}min`}
                </button>
              ))}
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full rounded-full grad-primary py-3 text-sm font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
