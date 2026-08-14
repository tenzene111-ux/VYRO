import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, ImagePlus, Globe, Users, Lock, MessageSquare, Check, AlertTriangle, Sparkles } from "lucide-react";
import { loadProject, saveProject, deleteProject } from "../../lib/shorts/db";
import { totalDuration, type ShortProject, type Visibility } from "../../lib/shorts/types";
import { formatDuration } from "../../lib/shorts/media";
import { renderProject, extractCoverFrame } from "../../lib/shorts/render";
import { uploadImage, uploadVideoBlob } from "../../lib/storage";
import { createVideoPost, getPostBrief, type PostBrief } from "../../lib/api";
import { suggestCaptions, type CaptionSuggestions } from "../../lib/ai";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/Avatar";

const PRIVACY_OPTIONS: { key: Visibility; label: string; icon: typeof Globe }[] = [
  { key: "everyone", label: "Everyone", icon: Globe },
  { key: "followers", label: "Followers", icon: Users },
  { key: "only_me", label: "Only Me", icon: Lock },
];

type Stage = "idle" | "rendering" | "uploading" | "publishing" | "published" | "failed";

export function ShortsPublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [project, setProject] = useState<ShortProject | null | undefined>(undefined);
  const [remixSource, setRemixSource] = useState<PostBrief | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [showCaptionAi, setShowCaptionAi] = useState(false);
  const [captionIntent, setCaptionIntent] = useState("");
  const [captionSuggesting, setCaptionSuggesting] = useState(false);
  const [captionSuggestions, setCaptionSuggestions] = useState<CaptionSuggestions | null>(null);
  const [captionAiError, setCaptionAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadProject(id).then((p) => setProject(p ?? null));
  }, [id]);

  useEffect(() => {
    if (!project?.remix) return;
    getPostBrief(project.remix.sourcePostId).then(setRemixSource).catch(() => {});
  }, [project?.remix]);

  useEffect(() => {
    if (!project || customCoverFile) return;
    let revoked = false;
    let url: string | null = null;
    extractCoverFrame(project, project.coverAtSec).then((blob) => {
      if (!blob || revoked) return;
      url = URL.createObjectURL(blob);
      setCoverUrl(url);
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [project?.id, project?.coverAtSec, customCoverFile]);

  const patch = (fn: (p: ShortProject) => ShortProject) => {
    setProject((prev) => (prev ? fn(prev) : prev));
  };

  const handleCoverFile = (file: File | null) => {
    if (!file) return;
    setCustomCoverFile(file);
    setCustomCoverPreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!project || !user || stage === "rendering" || stage === "uploading" || stage === "publishing") return;
    setError(null);
    try {
      setStage("rendering");
      setProgress(0);
      const videoBlob = await renderProject(project, (f) => setProgress(f));

      setStage("uploading");
      setProgress(0);
      const videoUrl = await uploadVideoBlob(user.id, videoBlob);

      let finalCoverUrl: string | null = null;
      if (customCoverFile) {
        finalCoverUrl = await uploadImage(user.id, customCoverFile);
      } else {
        const coverBlob = await extractCoverFrame(project, project.coverAtSec);
        if (coverBlob) {
          const file = new File([coverBlob], "cover.jpg", { type: "image/jpeg" });
          finalCoverUrl = await uploadImage(user.id, file);
        }
      }

      setStage("publishing");
      await createVideoPost(user.id, {
        caption: project.caption,
        videoUrl,
        coverUrl: finalCoverUrl,
        durationSeconds: totalDuration(project),
        visibility: project.visibility,
        commentsEnabled: project.commentsEnabled,
        remixType: project.remix?.type ?? null,
        remixOfPostId: project.remix?.sourcePostId ?? null,
      });

      await deleteProject(project.id);
      setStage("published");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while publishing.");
      setStage("failed");
    }
  };

  const handleSuggestCaptions = async () => {
    if (captionSuggesting) return;
    setCaptionSuggesting(true);
    setCaptionAiError(null);
    setCaptionSuggestions(null);
    try {
      const intent = captionIntent.trim() || project?.caption.trim() || "a short video";
      const result = await suggestCaptions(intent);
      setCaptionSuggestions(result);
    } catch (e) {
      setCaptionAiError(e instanceof Error ? e.message : "Couldn't get suggestions.");
    } finally {
      setCaptionSuggesting(false);
    }
  };

  const applyCaptionSuggestion = (caption: string, hashtags: string[]) => {
    const tagLine = hashtags.length > 0 ? `\n\n${hashtags.map((h) => `#${h}`).join(" ")}` : "";
    patch((p) => ({ ...p, caption: caption + tagLine }));
    setShowCaptionAi(false);
    setCaptionSuggestions(null);
  };

  const handleSaveDraft = async () => {
    if (project) await saveProject({ ...project, updatedAt: Date.now() });
    navigate("/create/reel");
  };

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

  if (stage === "published") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-void px-6 text-center safe-top safe-bottom">
        <span className="flex h-16 w-16 items-center justify-center rounded-full grad-primary">
          <Check className="h-7 w-7 text-white" />
        </span>
        <p className="font-display text-lg font-bold text-ink">Published!</p>
        <p className="text-[12.5px] text-mist">Your short video is live.</p>
        <button onClick={() => navigate("/home")} className="mt-2 rounded-full grad-primary px-6 py-3 text-sm font-semibold text-white">
          Go to Feed
        </button>
      </div>
    );
  }

  const busy = stage === "rendering" || stage === "uploading" || stage === "publishing";

  return (
    <div className="flex min-h-screen flex-col bg-void px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} disabled={busy} className="rounded-full p-2 chip text-mist disabled:opacity-40">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Publish</h1>
      </header>

      {project.remix && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl chip px-3.5 py-2.5">
          <span className="text-[12px] font-medium text-violet-300">
            {project.remix.type === "duet" ? "🎬 Duet" : "✂️ Stitch"}
            {remixSource ? ` with @${remixSource.author.username}` : ""}
          </span>
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <div className="relative h-32 w-20 shrink-0 overflow-hidden rounded-2xl bg-black">
          {(customCoverPreview ?? coverUrl) && (
            <img src={customCoverPreview ?? coverUrl ?? ""} alt="" className="h-full w-full object-cover" />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[9.5px] font-medium text-white"
          >
            <ImagePlus className="h-2.5 w-2.5" /> Cover
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex-1">
          {!customCoverFile && (
            <>
              <p className="mb-1 text-[11.5px] text-mist">Pick a cover frame</p>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, totalDuration(project))}
                step={0.1}
                value={project.coverAtSec}
                onChange={(e) => patch((p) => ({ ...p, coverAtSec: Number(e.target.value) }))}
                className="w-full accent-fuchsia-500"
              />
            </>
          )}
          <p className="mt-1 text-[11px] text-mist">{formatDuration(totalDuration(project))} · {project.clips.length} clips</p>
        </div>
      </div>

      <div className="mb-2 flex items-start gap-2.5">
        <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={32} />
        <div className="relative flex-1">
          <textarea
            value={project.caption}
            onChange={(e) => patch((p) => ({ ...p, caption: e.target.value }))}
            placeholder="Write a caption…"
            rows={3}
            className="w-full resize-none rounded-2xl glass-card px-3.5 py-2.5 pr-10 text-[13px] text-ink outline-none placeholder:text-mist/60"
          />
          <button
            onClick={() => setShowCaptionAi((v) => !v)}
            className={`absolute right-2.5 top-2.5 rounded-full p-1.5 ${showCaptionAi ? "grad-primary text-white" : "chip text-violet-300"}`}
            title="AI caption suggestions"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showCaptionAi && (
        <div className="mb-4 ml-[42px] rounded-2xl glass-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              value={captionIntent}
              onChange={(e) => setCaptionIntent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSuggestCaptions()}
              placeholder="What's this video about?"
              className="flex-1 rounded-full chip px-3.5 py-2 text-[12.5px] text-ink outline-none placeholder:text-mist/60"
            />
            <button
              onClick={handleSuggestCaptions}
              disabled={captionSuggesting}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full grad-primary text-white disabled:opacity-50"
            >
              {captionSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </button>
          </div>
          {captionAiError && <p className="text-[11.5px] text-rose-400">{captionAiError}</p>}
          {captionSuggestions && (
            <div className="space-y-1.5">
              {captionSuggestions.captions.map((c, i) => (
                <button
                  key={i}
                  onClick={() => applyCaptionSuggestion(c, captionSuggestions.hashtags)}
                  className="block w-full rounded-xl bg-white/5 px-3 py-2 text-left text-[12px] text-ink"
                >
                  {c}
                </button>
              ))}
              {captionSuggestions.hashtags.length > 0 && (
                <p className="px-1 text-[11px] text-mist">{captionSuggestions.hashtags.map((h) => `#${h}`).join(" ")}</p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mb-2 text-[12px] font-medium text-mist">Who can watch</p>
      <div className="mb-4 flex gap-2">
        {PRIVACY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = project.visibility === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => patch((p) => ({ ...p, visibility: opt.key }))}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 ${active ? "grad-primary text-white" : "chip text-mist"}`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10.5px] font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => patch((p) => ({ ...p, commentsEnabled: !p.commentsEnabled }))}
        className="mb-6 flex items-center justify-between rounded-2xl glass-card px-4 py-3"
      >
        <span className="flex items-center gap-2 text-[13px] text-ink">
          <MessageSquare className="h-4 w-4 text-mist" /> Allow comments
        </span>
        <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${project.commentsEnabled ? "grad-primary" : "bg-white/15"}`}>
          <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${project.commentsEnabled ? "translate-x-4" : ""}`} />
        </span>
      </button>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p className="text-[12px] text-rose-300">{error}</p>
        </div>
      )}

      {busy && (
        <div className="mb-4">
          <p className="mb-1.5 text-[12px] text-mist">
            {stage === "rendering" && "Rendering your video…"}
            {stage === "uploading" && "Uploading…"}
            {stage === "publishing" && "Publishing…"}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full grad-primary transition-all"
              style={{ width: stage === "publishing" ? "100%" : `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-8 mt-auto flex gap-2">
        <button onClick={handleSaveDraft} disabled={busy} className="flex-1 rounded-full chip py-3 text-[13px] font-medium text-mist disabled:opacity-40">
          Save Draft
        </button>
        <button
          onClick={handlePublish}
          disabled={busy || project.clips.length === 0}
          className="flex flex-[2] items-center justify-center gap-2 rounded-full grad-primary py-3 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {stage === "failed" ? "Retry Publish" : "Publish"}
        </button>
      </div>
    </div>
  );
}
