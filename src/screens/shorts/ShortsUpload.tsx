import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, X, ArrowUp, ArrowDown, Sparkles, Loader2 } from "lucide-react";
import { probeVideo, probeImage, formatDuration, formatBytes } from "../../lib/shorts/media";
import { putBlob, saveProject } from "../../lib/shorts/db";
import { createEmptyProject, type ShortClip, type FitMode } from "../../lib/shorts/types";
import { applyPreset } from "../../lib/shorts/filters";

type PendingItem = {
  id: string;
  file: File;
  kind: "video" | "photo";
  thumbnail: string;
  durationSec: number;
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
  fitMode: FitMode;
};

export function ShortsUpload() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project");
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setAnalyzing(true);
    setError(null);
    try {
      const files = Array.from(fileList);
      const analyzed: PendingItem[] = [];
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) continue;
        const url = URL.createObjectURL(file);
        if (isVideo) {
          const probe = await probeVideo(file);
          analyzed.push({
            id: crypto.randomUUID(),
            file,
            kind: "video",
            thumbnail: url,
            durationSec: probe.durationSec,
            width: probe.width,
            height: probe.height,
            orientation: probe.orientation,
            fitMode: probe.orientation === "landscape" ? "fit-blur" : "crop",
          });
        } else {
          const probe = await probeImage(file);
          analyzed.push({
            id: crypto.randomUUID(),
            file,
            kind: "photo",
            thumbnail: url,
            durationSec: 3,
            width: probe.width,
            height: probe.height,
            orientation: probe.orientation,
            fitMode: probe.orientation === "landscape" ? "fit-blur" : "crop",
          });
        }
      }
      setItems((prev) => [...prev, ...analyzed]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read one of the selected files.");
    } finally {
      setAnalyzing(false);
    }
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const move = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const setFitMode = (id: string, mode: FitMode) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, fitMode: mode } : i)));

  const buildAndGo = async () => {
    if (items.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const project = createEmptyProject();
      if (projectId) project.id = projectId;
      const clips: ShortClip[] = [];
      for (const item of items) {
        const blobKey = await putBlob(item.file);
        clips.push({
          id: item.id,
          kind: item.kind,
          blobKey,
          sourceDurationSec: item.durationSec,
          trimStartSec: 0,
          trimEndSec: item.durationSec,
          speed: 1,
          volume: 1,
          muted: false,
          filter: applyPreset("natural"),
          photoDurationSec: 3,
          photoMotion: item.kind === "photo" ? "zoom-in" : "none",
          fitMode: item.fitMode,
        });
      }
      project.clips = clips;
      await saveProject(project);
      navigate(`/create/reel/edit/${project.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't prepare your media.");
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-void px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Upload Media</h1>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {items.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={analyzing}
          className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl glass-card p-10 text-center"
        >
          {analyzing ? (
            <Loader2 className="h-7 w-7 animate-spin text-mist" />
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full grad-purple-blue">
                <Upload className="h-6 w-6 text-white" />
              </span>
              <p className="font-display text-sm font-semibold text-ink">Choose videos or photos</p>
              <p className="max-w-[220px] text-[12px] text-mist">Select one or more clips from your device.</p>
            </>
          )}
        </button>
      ) : (
        <>
          <div className="mb-4 flex-1 space-y-2 overflow-y-auto pb-4">
            {items.map((item, i) => (
              <div key={item.id} className="rounded-2xl glass-card p-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-xl bg-black/40">
                    {item.kind === "video" ? (
                      <video src={item.thumbnail} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={item.thumbnail} className="h-full w-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink">{item.file.name}</p>
                    <p className="text-[11px] text-mist">
                      {item.kind === "video" ? formatDuration(item.durationSec) : "Photo"} · {item.width}×{item.height} ·{" "}
                      {formatBytes(item.file.size)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full chip p-1.5 text-mist disabled:opacity-30">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      className="rounded-full chip p-1.5 text-mist disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <button onClick={() => remove(item.id)} className="shrink-0 rounded-full chip p-1.5 text-rose-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {item.orientation === "landscape" && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/5 p-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-fuchsia-300" />
                    <p className="flex-1 text-[11px] text-mist">Landscape clip — how should it fill the 9:16 frame?</p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setFitMode(item.id, "crop")}
                        className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium ${
                          item.fitMode === "crop" ? "grad-purple-blue text-white" : "chip text-mist"
                        }`}
                      >
                        Crop
                      </button>
                      <button
                        onClick={() => setFitMode(item.id, "fit-blur")}
                        className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium ${
                          item.fitMode === "fit-blur" ? "grad-purple-blue text-white" : "chip text-mist"
                        }`}
                      >
                        Fit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pb-8">
            <button onClick={() => inputRef.current?.click()} className="flex-1 rounded-full chip py-3 text-[13px] font-medium text-mist">
              Add More
            </button>
            <button
              onClick={buildAndGo}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full grad-primary py-3 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </button>
          </div>
        </>
      )}
      {error && <p className="pb-4 text-center text-[12px] text-rose-400">{error}</p>}
    </div>
  );
}
