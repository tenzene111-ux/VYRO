import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2 } from "lucide-react";
import { gradientFor } from "../lib/gradients";
import { useAuth } from "../context/AuthContext";
import { createStory } from "../lib/api";

export function CreateStory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!user || !caption.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createStory(user.id, caption.trim());
      navigate("/home", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post your story. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ background: gradientFor(caption || "story-draft") }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      <div className="relative z-10 flex items-center justify-between px-4 pt-4 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full bg-black/35 p-2 text-white backdrop-blur">
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-white">New Story</p>
        <button
          onClick={handlePost}
          disabled={!caption.trim() || busy}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Share
        </button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-10">
        <textarea
          autoFocus
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Type your story..."
          rows={4}
          maxLength={140}
          className="w-full resize-none bg-transparent text-center font-display text-2xl font-bold text-white placeholder:text-white/50 focus:outline-none"
        />
      </div>

      {error && <p className="relative z-10 px-6 pb-4 text-center text-[12.5px] text-rose-300">{error}</p>}

      <p className="relative z-10 pb-8 text-center text-[11px] text-white/50 safe-bottom">
        Visible to everyone on VYRO for 24 hours
      </p>
    </div>
  );
}
