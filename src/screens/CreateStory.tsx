import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, ImagePlus, Video as VideoIcon, Users, Globe2 } from "lucide-react";
import { gradientFor } from "../lib/gradients";
import { useAuth } from "../context/AuthContext";
import { createStory } from "../lib/api";
import { uploadImage, uploadVideoBlob } from "../lib/storage";

export function CreateStory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [audience, setAudience] = useState<"everyone" | "close_friends">("everyone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickMedia = (file: File | undefined) => {
    if (!file) return;
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(file);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveMedia = () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(null);
    setMediaType(null);
    setMediaPreviewUrl(null);
  };

  const canPost = !!(caption.trim() || mediaFile);

  const handlePost = async () => {
    if (!user || !canPost || busy) return;
    setBusy(true);
    setError(null);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      if (mediaFile && mediaType === "image") imageUrl = await uploadImage(user.id, mediaFile);
      else if (mediaFile && mediaType === "video") {
        const ext = mediaFile.name.split(".").pop() ?? "mp4";
        videoUrl = await uploadVideoBlob(user.id, mediaFile, ext);
      }
      await createStory(user.id, caption.trim(), imageUrl, videoUrl, audience);
      navigate("/home", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post your story. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      {mediaPreviewUrl ? (
        mediaType === "video" ? (
          <video src={mediaPreviewUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <img src={mediaPreviewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0" style={{ background: gradientFor(caption || "story-draft") }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      <div className="relative z-10 flex items-center justify-between px-4 pt-4 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full bg-black/35 p-2 text-white backdrop-blur">
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-white">New Story</p>
        <button
          onClick={handlePost}
          disabled={!canPost || busy}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Share
        </button>
      </div>

      {!mediaPreviewUrl && (
        <div className="relative z-10 flex items-center justify-center gap-3 pt-6">
          <label className="flex items-center gap-1.5 rounded-full bg-black/35 px-3.5 py-2 text-[12.5px] font-medium text-white backdrop-blur">
            <ImagePlus className="h-4 w-4" /> Photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePickMedia(e.target.files?.[0])} />
          </label>
          <label className="flex items-center gap-1.5 rounded-full bg-black/35 px-3.5 py-2 text-[12.5px] font-medium text-white backdrop-blur">
            <VideoIcon className="h-4 w-4" /> Video
            <input type="file" accept="video/*" className="hidden" onChange={(e) => handlePickMedia(e.target.files?.[0])} />
          </label>
        </div>
      )}

      {mediaPreviewUrl && (
        <button
          onClick={handleRemoveMedia}
          className="relative z-10 ml-auto mr-4 mt-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11.5px] font-medium text-white backdrop-blur"
        >
          <X className="h-3.5 w-3.5" /> Remove
        </button>
      )}

      <div className={`relative z-10 flex flex-1 items-center justify-center px-10 ${mediaPreviewUrl ? "items-end pb-24" : ""}`}>
        <textarea
          autoFocus={!mediaPreviewUrl}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={mediaPreviewUrl ? "Add a caption…" : "Type your story..."}
          rows={mediaPreviewUrl ? 2 : 4}
          maxLength={140}
          className={`w-full resize-none bg-transparent text-center font-display font-bold text-white placeholder:text-white/50 focus:outline-none ${
            mediaPreviewUrl ? "text-base" : "text-2xl"
          }`}
        />
      </div>

      {error && <p className="relative z-10 px-6 pb-4 text-center text-[12.5px] text-rose-300">{error}</p>}

      <div className="relative z-10 flex items-center justify-center gap-2 pb-8 safe-bottom">
        <button
          onClick={() => setAudience("everyone")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold backdrop-blur ${
            audience === "everyone" ? "grad-purple-blue text-white" : "bg-black/35 text-white/70"
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" /> Everyone
        </button>
        <button
          onClick={() => setAudience("close_friends")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold backdrop-blur ${
            audience === "close_friends" ? "bg-emerald-500 text-white" : "bg-black/35 text-white/70"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Close Friends
        </button>
        {audience === "close_friends" && (
          <button onClick={() => navigate("/close-friends")} className="text-[11px] font-medium text-emerald-300 underline">
            Manage list
          </button>
        )}
      </div>
    </div>
  );
}
