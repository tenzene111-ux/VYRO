import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Upload, Loader2, Trash2, Play } from "lucide-react";
import { listProjects, deleteProject } from "../../lib/shorts/db";
import { totalDuration, type ShortProject } from "../../lib/shorts/types";
import { formatDuration } from "../../lib/shorts/media";

export function ShortsStudio() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<ShortProject[] | null>(null);

  useEffect(() => {
    listProjects().then(setDrafts);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setDrafts((d) => (d ? d.filter((p) => p.id !== id) : d));
  };

  return (
    <div className="flex min-h-screen flex-col bg-void px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Short Video Studio</h1>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/create/reel/camera")}
          className="flex flex-col items-center justify-center gap-2.5 rounded-3xl glass-card p-6 glow-cyan"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full grad-primary">
            <span className="absolute inset-0 rounded-full grad-primary blur-lg opacity-60 animate-glow-pulse" />
            <Camera className="relative h-6 w-6 text-white" />
          </span>
          <span className="font-display text-sm font-semibold text-ink">Camera</span>
        </button>
        <button
          onClick={() => navigate("/create/reel/upload")}
          className="flex flex-col items-center justify-center gap-2.5 rounded-3xl glass-card p-6"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full grad-purple-blue">
            <Upload className="h-6 w-6 text-white" />
          </span>
          <span className="font-display text-sm font-semibold text-ink">Upload</span>
        </button>
      </div>

      <p className="mb-2 mt-4 text-[12.5px] font-medium text-mist">Recent Drafts</p>

      {drafts === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <p className="text-[12.5px] text-mist">No drafts yet. Start with Camera or Upload.</p>
        </div>
      ) : (
        <div className="space-y-2 pb-8">
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-2xl glass-card p-3">
              <button
                onClick={() => navigate(`/create/reel/edit/${d.id}`)}
                className="flex h-14 w-11 shrink-0 items-center justify-center rounded-xl grad-purple-blue"
              >
                <Play className="h-4 w-4 text-white" />
              </button>
              <button onClick={() => navigate(`/create/reel/edit/${d.id}`)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-medium text-ink">{d.caption || "Untitled draft"}</p>
                <p className="text-[11px] text-mist">
                  {d.clips.length} clip{d.clips.length === 1 ? "" : "s"} · {formatDuration(totalDuration(d))}
                </p>
              </button>
              <button onClick={() => handleDelete(d.id)} className="shrink-0 rounded-full chip p-2 text-rose-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
