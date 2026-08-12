import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Type,
  Captions as CaptionsIcon,
  Music,
  Sparkles,
  Mic,
  ChevronRight,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { loadProject, saveProject, getBlob, putBlob } from "../../lib/shorts/db";
import {
  clipDuration,
  totalDuration,
  type ShortProject,
  type ShortClip,
  type TextOverlay,
  type TextAnimation,
  type CaptionSegment,
  type CaptionStyle,
  type AudioTrack,
  type PhotoMotion,
  type FitMode,
} from "../../lib/shorts/types";
import { filterPresets, applyPreset, filterToCss } from "../../lib/shorts/filters";
import { detectSilenceTrim, pickBestCoverFrame, autoColorForClip } from "../../lib/shorts/smart";

type Panel = "none" | "clip" | "text" | "captions" | "audio" | "smart";

const TEXT_COLORS = ["#ffffff", "#0a0a12", "#22d3ee", "#d946ef", "#f59e0b", "#ef4444", "#22c55e", "#8b5cf6"];
const SPEED_OPTIONS = [0.3, 0.5, 1, 1.5, 2, 3];
const ANIMATIONS: TextAnimation[] = ["none", "fade", "pop", "slide", "typewriter", "bounce"];
const CAPTION_STYLES: CaptionStyle[] = ["minimal", "bold", "karaoke", "neon"];
const PHOTO_MOTIONS: PhotoMotion[] = ["none", "zoom-in", "zoom-out", "pan-left", "pan-right"];

export function ShortsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<ShortProject | null | undefined>(undefined);
  const pastRef = useRef<ShortProject[]>([]);
  const futureRef = useRef<ShortProject[]>([]);
  const [, forceHistoryTick] = useState(0);

  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  const [panel, setPanel] = useState<Panel>("none");
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [smartBusy, setSmartBusy] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragTextIdRef = useRef<string | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    loadProject(id).then((p) => setProject(p ?? null));
  }, [id]);

  // autosave
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => {
      saveProject({ ...project, updatedAt: Date.now() });
    }, 600);
    return () => clearTimeout(t);
  }, [project]);

  const mutate = (fn: (p: ShortProject) => ShortProject) => {
    setProject((prev) => {
      if (!prev) return prev;
      pastRef.current.push(prev);
      if (pastRef.current.length > 30) pastRef.current.shift();
      futureRef.current = [];
      forceHistoryTick((t) => t + 1);
      return fn(prev);
    });
  };

  const undo = () => {
    setProject((prev) => {
      if (!prev || pastRef.current.length === 0) return prev;
      const p = pastRef.current.pop()!;
      futureRef.current.push(prev);
      forceHistoryTick((t) => t + 1);
      return p;
    });
  };

  const redo = () => {
    setProject((prev) => {
      if (!prev || futureRef.current.length === 0) return prev;
      const p = futureRef.current.pop()!;
      pastRef.current.push(prev);
      forceHistoryTick((t) => t + 1);
      return p;
    });
  };

  const activeClip = project?.clips[activeClipIndex] ?? null;

  // resolve active clip's blob url
  useEffect(() => {
    if (!activeClip) {
      setActiveUrl(null);
      return;
    }
    let revoked = false;
    let url: string | null = null;
    getBlob(activeClip.blobKey).then((blob) => {
      if (!blob || revoked) return;
      url = URL.createObjectURL(blob);
      setActiveUrl(url);
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeClip?.blobKey]);

  useEffect(() => {
    if (activeClip?.kind === "video" && videoRef.current && activeUrl) {
      videoRef.current.currentTime = activeClip.trimStartSec;
      videoRef.current.playbackRate = activeClip.speed;
      if (playing) videoRef.current.play().catch(() => {});
    }
    setLocalTime(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClipIndex, activeUrl]);

  const advanceClip = () => {
    if (!project) return;
    if (activeClipIndex < project.clips.length - 1) {
      setActiveClipIndex((i) => i + 1);
    } else {
      setPlaying(false);
      setActiveClipIndex(0);
      videoRef.current?.pause();
    }
  };

  useEffect(() => {
    if (!activeClip || activeClip.kind !== "photo" || !playing) return;
    const start = Date.now();
    const poll = setInterval(() => setLocalTime((Date.now() - start) / 1000), 100);
    const timeout = setTimeout(() => {
      clearInterval(poll);
      advanceClip();
    }, activeClip.photoDurationSec * 1000);
    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip?.id, playing]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !activeClip) return;
    setLocalTime(v.currentTime - activeClip.trimStartSec);
    if (v.currentTime >= activeClip.trimEndSec) {
      v.pause();
      advanceClip();
    }
  };

  const togglePlay = () => {
    if (!activeClip) return;
    if (playing) {
      setPlaying(false);
      videoRef.current?.pause();
    } else {
      setPlaying(true);
      if (activeClip.kind === "video") videoRef.current?.play().catch(() => {});
    }
  };

  const clipsBefore = useMemo(() => {
    if (!project) return 0;
    return project.clips.slice(0, activeClipIndex).reduce((s, c) => s + clipDuration(c), 0);
  }, [project, activeClipIndex]);

  const globalPlayhead = activeClip
    ? clipsBefore + (activeClip.kind === "video" ? Math.max(0, localTime) / activeClip.speed : localTime)
    : 0;

  const duration = project ? totalDuration(project) : 0;

  // ---------- clip mutators ----------
  const updateClip = (clipId: string, patch: Partial<ShortClip>) =>
    mutate((p) => ({ ...p, clips: p.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)) }));

  const removeClip = (clipId: string) => {
    mutate((p) => ({ ...p, clips: p.clips.filter((c) => c.id !== clipId) }));
    setPanel("none");
    setActiveClipIndex(0);
  };

  const duplicateClip = (clipId: string) => {
    mutate((p) => {
      const idx = p.clips.findIndex((c) => c.id === clipId);
      if (idx < 0) return p;
      const copy = { ...p.clips[idx], id: crypto.randomUUID() };
      const clips = [...p.clips];
      clips.splice(idx + 1, 0, copy);
      return { ...p, clips };
    });
  };

  const splitActiveClip = () => {
    if (!activeClip || activeClip.kind !== "video") return;
    const at = activeClip.trimStartSec + Math.max(0, localTime);
    mutate((p) => {
      const idx = p.clips.findIndex((c) => c.id === activeClip.id);
      if (idx < 0) return p;
      const c = p.clips[idx];
      if (at <= c.trimStartSec + 0.15 || at >= c.trimEndSec - 0.15) return p;
      const first: ShortClip = { ...c, trimEndSec: at };
      const second: ShortClip = { ...c, id: crypto.randomUUID(), trimStartSec: at };
      const clips = [...p.clips];
      clips.splice(idx, 1, first, second);
      return { ...p, clips };
    });
  };

  const reorderClip = (index: number, dir: -1 | 1) => {
    mutate((p) => {
      const clips = [...p.clips];
      const t = index + dir;
      if (t < 0 || t >= clips.length) return p;
      [clips[index], clips[t]] = [clips[t], clips[index]];
      return { ...p, clips };
    });
    setActiveClipIndex((i) => (i === index ? index + dir : i));
  };

  const applyFilterPreset = (clipId: string, key: string) => updateClip(clipId, { filter: applyPreset(key) });

  // ---------- text mutators ----------
  const addText = () => {
    if (!project) return;
    const newId = crypto.randomUUID();
    mutate((p) => ({
      ...p,
      texts: [
        ...p.texts,
        {
          id: newId,
          text: "Tap to edit",
          x: 0.5,
          y: 0.5,
          rotation: 0,
          fontSize: 28,
          color: "#ffffff",
          background: null,
          animation: "fade",
          startSec: globalPlayhead,
          endSec: Math.min(totalDuration(p), globalPlayhead + 3),
        },
      ],
    }));
    setSelectedTextId(newId);
    setPanel("text");
  };
  const updateText = (textId: string, patch: Partial<TextOverlay>) =>
    mutate((p) => ({ ...p, texts: p.texts.map((t) => (t.id === textId ? { ...t, ...patch } : t)) }));
  const removeText = (textId: string) => {
    mutate((p) => ({ ...p, texts: p.texts.filter((t) => t.id !== textId) }));
    setSelectedTextId(null);
  };

  const handleTextDrag = (e: React.PointerEvent, textId: string) => {
    e.stopPropagation();
    dragTextIdRef.current = textId;
    const move = (ev: PointerEvent) => {
      const rect = previewRef.current?.getBoundingClientRect();
      if (!rect || !dragTextIdRef.current) return;
      const x = Math.min(0.95, Math.max(0.05, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(0.95, Math.max(0.05, (ev.clientY - rect.top) / rect.height));
      updateText(dragTextIdRef.current, { x, y });
    };
    const up = () => {
      dragTextIdRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ---------- captions ----------
  const addCaption = () => {
    if (!project) return;
    mutate((p) => ({
      ...p,
      captionsEnabled: true,
      captions: [
        ...p.captions,
        { id: crypto.randomUUID(), text: "New caption", startSec: globalPlayhead, endSec: Math.min(totalDuration(p), globalPlayhead + 2) },
      ],
    }));
  };
  const updateCaption = (capId: string, patch: Partial<CaptionSegment>) =>
    mutate((p) => ({ ...p, captions: p.captions.map((c) => (c.id === capId ? { ...c, ...patch } : c)) }));
  const removeCaption = (capId: string) => mutate((p) => ({ ...p, captions: p.captions.filter((c) => c.id !== capId) }));

  const activeCaption = project?.captions.find((c) => globalPlayhead >= c.startSec && globalPlayhead <= c.endSec);
  const activeTexts = project?.texts.filter((t) => globalPlayhead >= t.startSec && globalPlayhead <= t.endSec) ?? [];

  // ---------- audio ----------
  const [recordingVoiceover, setRecordingVoiceover] = useState(false);
  const voRecorderRef = useRef<MediaRecorder | null>(null);
  const voChunksRef = useRef<Blob[]>([]);
  const voStreamRef = useRef<MediaStream | null>(null);

  const handleAddMusic = async (file: File | null) => {
    if (!file) return;
    const dur = await new Promise<number>((resolve) => {
      const a = new Audio(URL.createObjectURL(file));
      a.onloadedmetadata = () => resolve(a.duration || 10);
    });
    const blobKey = await putBlob(file);
    const track: AudioTrack = {
      id: crypto.randomUUID(),
      kind: "music",
      name: file.name,
      blobKey,
      startSec: 0,
      trimStartSec: 0,
      trimEndSec: dur,
      sourceDurationSec: dur,
      volume: 0.6,
    };
    mutate((p) => ({ ...p, audioTracks: [...p.audioTracks.filter((a) => a.kind !== "music"), track] }));
  };

  const startVoiceover = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voStreamRef.current = stream;
      voChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voChunksRef.current.push(e.data);
      };
      recorder.start();
      voRecorderRef.current = recorder;
      setRecordingVoiceover(true);
    } catch {
      // mic permission denied — control simply stays inactive
    }
  };

  const stopVoiceover = async () => {
    const recorder = voRecorderRef.current;
    if (!recorder) return;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    voStreamRef.current?.getTracks().forEach((t) => t.stop());
    setRecordingVoiceover(false);
    const blob = new Blob(voChunksRef.current, { type: "audio/webm" });
    const dur = await new Promise<number>((resolve) => {
      const a = new Audio(URL.createObjectURL(blob));
      a.onloadedmetadata = () => resolve(a.duration || 1);
    });
    const blobKey = await putBlob(blob);
    const track: AudioTrack = {
      id: crypto.randomUUID(),
      kind: "voiceover",
      name: "Voiceover",
      blobKey,
      startSec: 0,
      trimStartSec: 0,
      trimEndSec: dur,
      sourceDurationSec: dur,
      volume: 1,
    };
    mutate((p) => ({ ...p, audioTracks: [...p.audioTracks.filter((a) => a.kind !== "voiceover"), track] }));
  };

  const updateAudioTrack = (trackId: string, patch: Partial<AudioTrack>) =>
    mutate((p) => ({ ...p, audioTracks: p.audioTracks.map((a) => (a.id === trackId ? { ...a, ...patch } : a)) }));
  const removeAudioTrack = (trackId: string) => mutate((p) => ({ ...p, audioTracks: p.audioTracks.filter((a) => a.id !== trackId) }));

  // ---------- smart tools ----------
  const handleTrimSilence = async () => {
    if (!project) return;
    setSmartBusy("silence");
    try {
      const updates = await Promise.all(project.clips.map(async (c) => ({ id: c.id, res: await detectSilenceTrim(c) })));
      mutate((p) => ({
        ...p,
        clips: p.clips.map((c) => {
          const u = updates.find((x) => x.id === c.id);
          return u?.res ? { ...c, trimStartSec: u.res.trimStartSec, trimEndSec: u.res.trimEndSec } : c;
        }),
      }));
    } finally {
      setSmartBusy(null);
    }
  };

  const handleAutoCover = async () => {
    if (!project || project.clips.length === 0) return;
    setSmartBusy("cover");
    try {
      const best = await pickBestCoverFrame(project.clips[0]);
      mutate((p) => ({ ...p, coverAtSec: best }));
    } finally {
      setSmartBusy(null);
    }
  };

  const handleAutoColor = async () => {
    if (!project) return;
    setSmartBusy("color");
    try {
      const results = await Promise.all(project.clips.map(async (c) => ({ id: c.id, res: await autoColorForClip(c) })));
      mutate((p) => ({
        ...p,
        clips: p.clips.map((c) => {
          const u = results.find((x) => x.id === c.id);
          return u?.res ? { ...c, filter: { ...c.filter, brightness: u.res.brightness, contrast: u.res.contrast } } : c;
        }),
      }));
    } finally {
      setSmartBusy(null);
    }
  };

  const handleShorten15 = () => {
    mutate((p) => {
      const target = 15;
      let acc = 0;
      const clips: ShortClip[] = [];
      for (const c of p.clips) {
        const d = clipDuration(c);
        if (acc >= target) break;
        if (acc + d <= target) {
          clips.push(c);
          acc += d;
        } else {
          const allowed = target - acc;
          if (c.kind === "video") {
            clips.push({ ...c, trimEndSec: c.trimStartSec + allowed * c.speed });
          } else {
            clips.push({ ...c, photoDurationSec: allowed });
          }
          acc = target;
        }
      }
      return { ...p, clips };
    });
  };

  const addMediaMore = () => navigate(`/create/reel/upload?project=${id}`);

  if (project === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2 className="h-6 w-6 animate-spin text-mist" />
      </div>
    );
  }
  if (project === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-void px-6 text-center">
        <p className="text-[13px] text-mist">This draft no longer exists.</p>
        <button onClick={() => navigate("/create/reel")} className="rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white">
          Back to Studio
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-3 pt-3 safe-top">
        <button onClick={() => navigate("/create/reel")} className="rounded-full bg-white/10 p-2 text-white">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={pastRef.current.length === 0} className="rounded-full bg-white/10 p-2 text-white disabled:opacity-30">
            <Undo2 className="h-4 w-4" />
          </button>
          <button onClick={redo} disabled={futureRef.current.length === 0} className="rounded-full bg-white/10 p-2 text-white disabled:opacity-30">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => navigate(`/create/reel/publish/${project.id}`)}
          disabled={project.clips.length === 0}
          className="flex items-center gap-1 rounded-full grad-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* preview */}
      <div className="relative mx-auto mt-3 aspect-[9/16] w-full max-w-[300px] flex-1 overflow-hidden rounded-3xl bg-neutral-950" ref={previewRef}>
        {activeClip?.kind === "video" && activeUrl && (
          <video
            ref={videoRef}
            src={activeUrl}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            style={{ filter: filterToCss(activeClip.filter), objectFit: activeClip.fitMode === "crop" ? "cover" : "contain" }}
            className="h-full w-full bg-black"
          />
        )}
        {activeClip?.kind === "photo" && activeUrl && (
          <img
            src={activeUrl}
            style={{ filter: filterToCss(activeClip.filter) }}
            className={`h-full w-full object-cover ${
              activeClip.photoMotion === "zoom-in" ? "animate-photo-zoom-in" : activeClip.photoMotion === "zoom-out" ? "animate-photo-zoom-out" : ""
            }`}
            alt=""
          />
        )}
        {!activeClip && <div className="flex h-full items-center justify-center text-[12.5px] text-mist">No clips yet</div>}

        {activeTexts.map((t) => (
          <div
            key={t.id}
            onPointerDown={(e) => {
              handleTextDrag(e, t.id);
              setSelectedTextId(t.id);
              setPanel("text");
            }}
            className={`absolute max-w-[80%] cursor-move select-none px-2 py-1 text-center font-display font-bold ${
              selectedTextId === t.id ? "outline outline-1 outline-white/60" : ""
            }`}
            style={{
              left: `${t.x * 100}%`,
              top: `${t.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
              color: t.color,
              fontSize: t.fontSize,
              background: t.background ?? "transparent",
              borderRadius: t.background ? 8 : 0,
            }}
          >
            <span
              key={`${t.id}-${globalPlayhead < t.startSec + 0.5 ? "in" : "static"}`}
              className={`inline-block whitespace-pre-wrap ${t.animation !== "none" ? `animate-text-${t.animation}` : ""}`}
            >
              {t.text}
            </span>
          </div>
        ))}

        {project.captionsEnabled && activeCaption && (
          <div
            className={`absolute inset-x-4 bottom-6 text-center text-[15px] font-semibold ${
              project.captionStyle === "neon"
                ? "text-cyan-300 [text-shadow:0_0_8px_rgba(34,211,238,0.9)]"
                : project.captionStyle === "karaoke"
                ? "text-amber-300"
                : project.captionStyle === "bold"
                ? "text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]"
                : "text-white/90"
            }`}
          >
            <span className={project.captionStyle === "bold" || project.captionStyle === "karaoke" ? "rounded-lg bg-black/50 px-2 py-1" : ""}>
              {activeCaption.text}
            </span>
          </div>
        )}

        <button onClick={togglePlay} className="absolute inset-0 z-0 flex items-center justify-center">
          {!playing && (
            <span className="rounded-full bg-black/40 p-4 backdrop-blur">
              <Play className="h-6 w-6 text-white" />
            </span>
          )}
        </button>
      </div>

      {/* clip timeline */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-3">
        {project.clips.map((c, i) => (
          <ClipThumb
            key={c.id}
            clip={c}
            active={i === activeClipIndex}
            onSelect={() => {
              setActiveClipIndex(i);
              setPanel("clip");
              setPlaying(false);
            }}
          />
        ))}
        <button onClick={addMediaMore} className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/25 text-white/60">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* bottom toolbar */}
      {panel === "none" && (
        <div className="flex items-center justify-around border-t border-white/10 px-2 py-3 safe-bottom">
          <ToolBtn icon={Type} label="Text" onClick={addText} />
          <ToolBtn icon={CaptionsIcon} label="Captions" onClick={() => setPanel("captions")} />
          <ToolBtn icon={Music} label="Audio" onClick={() => setPanel("audio")} />
          <ToolBtn icon={Sparkles} label="Smart" onClick={() => setPanel("smart")} />
        </div>
      )}

      {panel === "clip" && activeClip && (
        <ClipPanel
          clip={activeClip}
          canSplit={activeClip.kind === "video" && localTime > 0.2 && localTime < activeClip.trimEndSec - activeClip.trimStartSec - 0.2}
          onClose={() => setPanel("none")}
          onUpdate={(patch) => updateClip(activeClip.id, patch)}
          onPreset={(key) => applyFilterPreset(activeClip.id, key)}
          onSplit={splitActiveClip}
          onDuplicate={() => duplicateClip(activeClip.id)}
          onDelete={() => removeClip(activeClip.id)}
          onMoveLeft={() => reorderClip(activeClipIndex, -1)}
          onMoveRight={() => reorderClip(activeClipIndex, 1)}
        />
      )}

      {panel === "text" && selectedTextId && (
        <TextPanel
          text={project.texts.find((t) => t.id === selectedTextId)!}
          duration={duration}
          onClose={() => setPanel("none")}
          onUpdate={(patch) => updateText(selectedTextId, patch)}
          onDelete={() => {
            removeText(selectedTextId);
            setPanel("none");
          }}
        />
      )}

      {panel === "captions" && (
        <CaptionsPanel
          project={project}
          playhead={globalPlayhead}
          onToggle={(v) => mutate((p) => ({ ...p, captionsEnabled: v }))}
          onStyle={(s) => mutate((p) => ({ ...p, captionStyle: s }))}
          onAdd={addCaption}
          onUpdate={updateCaption}
          onRemove={removeCaption}
          onClose={() => setPanel("none")}
        />
      )}

      {panel === "audio" && (
        <AudioPanel
          project={project}
          musicInputRef={musicInputRef}
          recordingVoiceover={recordingVoiceover}
          onAddMusicClick={() => musicInputRef.current?.click()}
          onMusicFile={handleAddMusic}
          onStartVoiceover={startVoiceover}
          onStopVoiceover={stopVoiceover}
          onUpdateTrack={updateAudioTrack}
          onRemoveTrack={removeAudioTrack}
          onClose={() => setPanel("none")}
        />
      )}

      {panel === "smart" && (
        <SmartPanel
          busy={smartBusy}
          onTrimSilence={handleTrimSilence}
          onAutoCover={handleAutoCover}
          onAutoColor={handleAutoColor}
          onShorten={handleShorten15}
          onClose={() => setPanel("none")}
        />
      )}
    </div>
  );
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: typeof Type; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-white/80">
      <Icon className="h-5 w-5" />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function ClipThumb({ clip, active, onSelect }: { clip: ShortClip; active: boolean; onSelect: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let objUrl: string | null = null;
    getBlob(clip.blobKey).then((blob) => {
      if (!blob || revoked) return;
      objUrl = URL.createObjectURL(blob);
      setUrl(objUrl);
    });
    return () => {
      revoked = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [clip.blobKey]);

  return (
    <button
      onClick={onSelect}
      className={`h-16 w-11 shrink-0 overflow-hidden rounded-lg ${active ? "ring-2 ring-fuchsia-400" : "ring-1 ring-white/15"}`}
    >
      {clip.kind === "photo" ? (
        url && <img src={url} className="h-full w-full object-cover" alt="" />
      ) : (
        url && <video src={url} className="h-full w-full object-cover" muted />
      )}
    </button>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="max-h-[52vh] overflow-y-auto border-t border-white/10 bg-neutral-950 px-4 pb-6 pt-4 safe-bottom">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <button onClick={onClose} className="text-[12px] text-mist">
          Done
        </button>
      </div>
      {children}
    </div>
  );
}

function ClipPanel({
  clip,
  canSplit,
  onClose,
  onUpdate,
  onPreset,
  onSplit,
  onDuplicate,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: {
  clip: ShortClip;
  canSplit: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<ShortClip>) => void;
  onPreset: (key: string) => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  return (
    <Sheet title="Clip" onClose={onClose}>
      <div className="mb-3 flex flex-wrap gap-2">
        <IconAction icon={Scissors} label="Split" onClick={onSplit} disabled={!canSplit} />
        <IconAction icon={Copy} label="Duplicate" onClick={onDuplicate} />
        <IconAction icon={ArrowLeft} label="Move Left" onClick={onMoveLeft} />
        <IconAction icon={ArrowLeft} label="Move Right" onClick={onMoveRight} flip />
        <IconAction icon={Trash2} label="Delete" onClick={onDelete} danger />
      </div>

      {clip.kind === "video" ? (
        <>
          <Labeled label={`Trim start · ${clip.trimStartSec.toFixed(1)}s`}>
            <input
              type="range"
              min={0}
              max={clip.sourceDurationSec}
              step={0.1}
              value={clip.trimStartSec}
              onChange={(e) => onUpdate({ trimStartSec: Math.min(Number(e.target.value), clip.trimEndSec - 0.2) })}
              className="w-full accent-fuchsia-500"
            />
          </Labeled>
          <Labeled label={`Trim end · ${clip.trimEndSec.toFixed(1)}s`}>
            <input
              type="range"
              min={0}
              max={clip.sourceDurationSec}
              step={0.1}
              value={clip.trimEndSec}
              onChange={(e) => onUpdate({ trimEndSec: Math.max(Number(e.target.value), clip.trimStartSec + 0.2) })}
              className="w-full accent-fuchsia-500"
            />
          </Labeled>

          <p className="mb-1.5 mt-3 text-[11.5px] font-medium text-white/60">Speed</p>
          <div className="mb-3 flex gap-1.5">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onUpdate({ speed: s })}
                className={`flex-1 rounded-full py-1.5 text-[11px] font-medium ${
                  clip.speed === s ? "grad-primary text-white" : "bg-white/10 text-white/70"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => onUpdate({ muted: !clip.muted })} className="rounded-full bg-white/10 p-2 text-white">
              {clip.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={clip.volume}
              disabled={clip.muted}
              onChange={(e) => onUpdate({ volume: Number(e.target.value) })}
              className="flex-1 accent-fuchsia-500 disabled:opacity-30"
            />
          </div>

          <p className="mb-1.5 text-[11.5px] font-medium text-white/60">Fit</p>
          <div className="mb-3 flex gap-1.5">
            {(["crop", "fit-blur"] as FitMode[]).map((f) => (
              <button
                key={f}
                onClick={() => onUpdate({ fitMode: f })}
                className={`flex-1 rounded-full py-1.5 text-[11px] font-medium ${
                  clip.fitMode === f ? "grad-purple-blue text-white" : "bg-white/10 text-white/70"
                }`}
              >
                {f === "crop" ? "Crop" : "Fit"}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Labeled label={`Duration · ${clip.photoDurationSec.toFixed(1)}s`}>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={clip.photoDurationSec}
              onChange={(e) => onUpdate({ photoDurationSec: Number(e.target.value) })}
              className="w-full accent-fuchsia-500"
            />
          </Labeled>
          <p className="mb-1.5 mt-2 text-[11.5px] font-medium text-white/60">Motion</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PHOTO_MOTIONS.map((m) => (
              <button
                key={m}
                onClick={() => onUpdate({ photoMotion: m })}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  clip.photoMotion === m ? "grad-primary text-white" : "bg-white/10 text-white/70"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mb-1.5 mt-2 text-[11.5px] font-medium text-white/60">Filter</p>
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {filterPresets.map((p) => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
              clip.filter.preset === p.key ? "grad-purple-blue text-white" : "bg-white/10 text-white/70"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Labeled label="Brightness">
        <input type="range" min={60} max={140} value={clip.filter.brightness} onChange={(e) => onUpdate({ filter: { ...clip.filter, brightness: Number(e.target.value) } })} className="w-full accent-cyan-400" />
      </Labeled>
      <Labeled label="Contrast">
        <input type="range" min={60} max={140} value={clip.filter.contrast} onChange={(e) => onUpdate({ filter: { ...clip.filter, contrast: Number(e.target.value) } })} className="w-full accent-cyan-400" />
      </Labeled>
      <Labeled label="Saturation">
        <input type="range" min={0} max={160} value={clip.filter.saturation} onChange={(e) => onUpdate({ filter: { ...clip.filter, saturation: Number(e.target.value) } })} className="w-full accent-cyan-400" />
      </Labeled>
      <Labeled label="Temperature">
        <input type="range" min={-60} max={60} value={clip.filter.temperature} onChange={(e) => onUpdate({ filter: { ...clip.filter, temperature: Number(e.target.value) } })} className="w-full accent-cyan-400" />
      </Labeled>
      <Labeled label="Vignette">
        <input type="range" min={0} max={100} value={clip.filter.vignette} onChange={(e) => onUpdate({ filter: { ...clip.filter, vignette: Number(e.target.value) } })} className="w-full accent-cyan-400" />
      </Labeled>
      <Labeled label="Grain">
        <input type="range" min={0} max={100} value={clip.filter.grain} onChange={(e) => onUpdate({ filter: { ...clip.filter, grain: Number(e.target.value) } })} className="w-full accent-cyan-400" />
      </Labeled>
    </Sheet>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
  flip,
}: {
  icon: typeof Type;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  flip?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-xl bg-white/10 px-3 py-2 disabled:opacity-30 ${danger ? "text-rose-400" : "text-white/80"}`}
    >
      <Icon className={`h-4 w-4 ${flip ? "rotate-180" : ""}`} />
      <span className="text-[9.5px]">{label}</span>
    </button>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <p className="mb-1 text-[11px] text-white/50">{label}</p>
      {children}
    </div>
  );
}

function TextPanel({
  text,
  duration,
  onClose,
  onUpdate,
  onDelete,
}: {
  text: TextOverlay;
  duration: number;
  onClose: () => void;
  onUpdate: (patch: Partial<TextOverlay>) => void;
  onDelete: () => void;
}) {
  return (
    <Sheet title="Text" onClose={onClose}>
      <textarea
        value={text.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        rows={2}
        className="mb-3 w-full resize-none rounded-xl bg-white/10 px-3 py-2 text-[13px] text-white outline-none"
      />
      <div className="mb-3 flex gap-1.5">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onUpdate({ color: c })}
            className={`h-7 w-7 rounded-full ${text.color === c ? "ring-2 ring-white" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <Labeled label={`Size · ${text.fontSize}px`}>
        <input type="range" min={14} max={56} value={text.fontSize} onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} className="w-full accent-fuchsia-500" />
      </Labeled>
      <Labeled label={`Rotation · ${text.rotation}°`}>
        <input type="range" min={-45} max={45} value={text.rotation} onChange={(e) => onUpdate({ rotation: Number(e.target.value) })} className="w-full accent-fuchsia-500" />
      </Labeled>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11.5px] text-white/60">Background</span>
        <button
          onClick={() => onUpdate({ background: text.background ? null : "rgba(0,0,0,0.5)" })}
          className={`rounded-full px-3 py-1 text-[11px] font-medium ${text.background ? "grad-primary text-white" : "bg-white/10 text-white/70"}`}
        >
          {text.background ? "On" : "Off"}
        </button>
      </div>
      <p className="mb-1.5 text-[11.5px] font-medium text-white/60">Animation</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {ANIMATIONS.map((a) => (
          <button
            key={a}
            onClick={() => onUpdate({ animation: a })}
            className={`rounded-full px-3 py-1.5 text-[11px] font-medium capitalize ${
              text.animation === a ? "grad-purple-blue text-white" : "bg-white/10 text-white/70"
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      <Labeled label={`Appears at ${text.startSec.toFixed(1)}s`}>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={text.startSec}
          onChange={(e) => onUpdate({ startSec: Math.min(Number(e.target.value), text.endSec - 0.2) })}
          className="w-full accent-cyan-400"
        />
      </Labeled>
      <Labeled label={`Disappears at ${text.endSec.toFixed(1)}s`}>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={text.endSec}
          onChange={(e) => onUpdate({ endSec: Math.max(Number(e.target.value), text.startSec + 0.2) })}
          className="w-full accent-cyan-400"
        />
      </Labeled>
      <button onClick={onDelete} className="mt-1 w-full rounded-full bg-rose-500/20 py-2.5 text-[12.5px] font-semibold text-rose-300">
        Delete Text
      </button>
    </Sheet>
  );
}

function CaptionsPanel({
  project,
  playhead,
  onToggle,
  onStyle,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}: {
  project: ShortProject;
  playhead: number;
  onToggle: (v: boolean) => void;
  onStyle: (s: CaptionStyle) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CaptionSegment>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  void playhead;
  return (
    <Sheet title="Captions" onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12.5px] text-white/70">Show captions</span>
        <button
          onClick={() => onToggle(!project.captionsEnabled)}
          className={`rounded-full px-3 py-1 text-[11px] font-medium ${project.captionsEnabled ? "grad-primary text-white" : "bg-white/10 text-white/70"}`}
        >
          {project.captionsEnabled ? "On" : "Off"}
        </button>
      </div>
      <div className="mb-3 flex gap-1.5">
        {CAPTION_STYLES.map((s) => (
          <button
            key={s}
            onClick={() => onStyle(s)}
            className={`flex-1 rounded-full py-1.5 text-[11px] font-medium capitalize ${
              project.captionStyle === s ? "grad-purple-blue text-white" : "bg-white/10 text-white/70"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <button onClick={onAdd} className="mb-3 w-full rounded-full bg-white/10 py-2 text-[12px] font-medium text-white/80">
        + Add Caption at Playhead
      </button>
      <div className="space-y-2">
        {project.captions.length === 0 && <p className="py-4 text-center text-[12px] text-mist">No captions yet.</p>}
        {project.captions.map((c) => (
          <div key={c.id} className="rounded-xl bg-white/5 p-2.5">
            <textarea
              value={c.text}
              onChange={(e) => onUpdate(c.id, { text: e.target.value })}
              rows={1}
              className="mb-1.5 w-full resize-none rounded-lg bg-white/10 px-2 py-1 text-[12px] text-white outline-none"
            />
            <div className="flex items-center justify-between text-[10.5px] text-white/50">
              <span>
                {c.startSec.toFixed(1)}s – {c.endSec.toFixed(1)}s
              </span>
              <button onClick={() => onRemove(c.id)} className="text-rose-400">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function AudioPanel({
  project,
  musicInputRef,
  recordingVoiceover,
  onAddMusicClick,
  onMusicFile,
  onStartVoiceover,
  onStopVoiceover,
  onUpdateTrack,
  onRemoveTrack,
  onClose,
}: {
  project: ShortProject;
  musicInputRef: React.RefObject<HTMLInputElement | null>;
  recordingVoiceover: boolean;
  onAddMusicClick: () => void;
  onMusicFile: (f: File | null) => void;
  onStartVoiceover: () => void;
  onStopVoiceover: () => void;
  onUpdateTrack: (id: string, patch: Partial<AudioTrack>) => void;
  onRemoveTrack: (id: string) => void;
  onClose: () => void;
}) {
  const music = project.audioTracks.find((a) => a.kind === "music");
  const voiceover = project.audioTracks.find((a) => a.kind === "voiceover");

  return (
    <Sheet title="Audio Mixer" onClose={onClose}>
      <input
        ref={musicInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => onMusicFile(e.target.files?.[0] ?? null)}
      />

      <p className="mb-1.5 text-[11.5px] font-medium text-white/60">Music</p>
      {music ? (
        <TrackRow track={music} onUpdate={(patch) => onUpdateTrack(music.id, patch)} onRemove={() => onRemoveTrack(music.id)} />
      ) : (
        <button onClick={onAddMusicClick} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-[12px] font-medium text-white/80">
          <Music className="h-3.5 w-3.5" /> Add Music from Device
        </button>
      )}

      <p className="mb-1.5 mt-3 text-[11.5px] font-medium text-white/60">Voiceover</p>
      {voiceover ? (
        <TrackRow track={voiceover} onUpdate={(patch) => onUpdateTrack(voiceover.id, patch)} onRemove={() => onRemoveTrack(voiceover.id)} />
      ) : (
        <button
          onClick={recordingVoiceover ? onStopVoiceover : onStartVoiceover}
          className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-medium ${
            recordingVoiceover ? "bg-rose-500 text-white" : "bg-white/10 text-white/80"
          }`}
        >
          <Mic className="h-3.5 w-3.5" /> {recordingVoiceover ? "Stop Recording" : "Record Voiceover"}
        </button>
      )}
    </Sheet>
  );
}

function TrackRow({
  track,
  onUpdate,
  onRemove,
}: {
  track: AudioTrack;
  onUpdate: (patch: Partial<AudioTrack>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-3 rounded-xl bg-white/5 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="truncate text-[12px] font-medium text-white">{track.name}</p>
        <button onClick={onRemove} className="shrink-0 text-[11px] text-rose-400">
          Remove
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-white/50" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={track.volume}
          onChange={(e) => onUpdate({ volume: Number(e.target.value) })}
          className="flex-1 accent-fuchsia-500"
        />
      </div>
    </div>
  );
}

function SmartPanel({
  busy,
  onTrimSilence,
  onAutoCover,
  onAutoColor,
  onShorten,
  onClose,
}: {
  busy: string | null;
  onTrimSilence: () => void;
  onAutoCover: () => void;
  onAutoColor: () => void;
  onShorten: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Smart Tools" onClose={onClose}>
      <p className="mb-3 text-[11.5px] text-white/50">
        Real analysis run on your clips right on this device — no cloud AI, no account needed.
      </p>
      <div className="space-y-2">
        <SmartAction label="Trim Silence" description="Cuts dead air from the start/end of each clip using its audio." busy={busy === "silence"} onClick={onTrimSilence} />
        <SmartAction label="Auto Cover" description="Picks the sharpest, best-lit frame as your cover." busy={busy === "cover"} onClick={onAutoCover} />
        <SmartAction label="Auto Color" description="Balances exposure across your clips." busy={busy === "color"} onClick={onAutoColor} />
        <SmartAction label="Shorten to 15s" description="Trims your timeline down to a tight 15 seconds." busy={false} onClick={onShorten} />
      </div>
    </Sheet>
  );
}

function SmartAction({
  label,
  description,
  busy,
  onClick,
}: {
  label: string;
  description: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={busy} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left disabled:opacity-60">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full grad-purple-blue">
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
      </span>
      <span className="min-w-0">
        <p className="text-[12.5px] font-semibold text-white">{label}</p>
        <p className="text-[11px] text-white/50">{description}</p>
      </span>
    </button>
  );
}
