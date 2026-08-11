import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Users, Globe2, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createGroup } from "../lib/api";

export function CreateGroup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const groupId = await createGroup(name.trim(), description.trim(), privacy);
      navigate(`/chat/group/${groupId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the group. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-vyro-radial px-5 safe-top">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <X className="h-4.5 w-4.5" />
        </button>
        <p className="font-display text-base font-semibold text-ink">Create Group</p>
        <button
          onClick={handleCreate}
          disabled={!name.trim() || busy}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create
        </button>
      </header>

      <div className="flex flex-col items-center gap-3 py-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl grad-primary glow-violet">
          <Users className="h-7 w-7 text-white" />
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Group name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Travel Lovers"
            className="rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What's this group about?"
            className="resize-none rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={() => setPrivacy("public")}
          className={`flex items-center gap-3 rounded-2xl p-4 text-left transition-colors ${
            privacy === "public" ? "glass-card glow-violet" : "chip"
          }`}
        >
          <Globe2 className="h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-sm font-semibold text-ink">Public</p>
            <p className="text-[12px] text-mist">Anyone can find and join this group.</p>
          </div>
        </button>
        <button
          onClick={() => setPrivacy("private")}
          className={`flex items-center gap-3 rounded-2xl p-4 text-left transition-colors ${
            privacy === "private" ? "glass-card glow-violet" : "chip"
          }`}
        >
          <Lock className="h-5 w-5 text-violet-300" />
          <div>
            <p className="text-sm font-semibold text-ink">Private</p>
            <p className="text-[12px] text-mist">Only visible to members you invite.</p>
          </div>
        </button>
      </div>

      {error && <p className="mt-4 text-[12.5px] text-rose-400">{error}</p>}
    </div>
  );
}
