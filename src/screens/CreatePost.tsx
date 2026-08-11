import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { createPost } from "../lib/api";

export function CreatePost() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!user || !text.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await createPost(user.id, text.trim());
      navigate("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't publish your post. Try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-vyro-radial safe-top">
      <header className="flex items-center justify-between px-4 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <X className="h-4.5 w-4.5" />
        </button>
        <p className="font-display text-base font-semibold text-ink">Create Post</p>
        <button
          disabled={!text.trim() || posting}
          onClick={handlePost}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {posting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Post
        </button>
      </header>

      <div className="flex items-center gap-3 px-4 pb-3">
        <Avatar name={profile?.name ?? "You"} size={42} />
        <div>
          <p className="text-sm font-semibold text-ink">{profile?.name ?? ""}</p>
          <span className="mt-0.5 inline-flex items-center rounded-full chip px-2.5 py-1 text-[11px] font-medium text-ink">
            Public
          </span>
        </div>
      </div>

      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind?"
        rows={6}
        className="mx-4 flex-1 resize-none bg-transparent text-[15px] text-ink placeholder:text-mist/70 focus:outline-none"
      />

      {error && <p className="mx-4 mb-4 text-[12.5px] text-rose-400">{error}</p>}
    </div>
  );
}
