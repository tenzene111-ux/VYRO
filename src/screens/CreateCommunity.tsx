import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Users2, ImagePlus, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createCommunity } from "../lib/api";
import { uploadImage } from "../lib/storage";

const categories = ["Travel", "Culture", "Food", "Students", "Photography", "Music", "Sports", "Technology"];

export function CreateCommunity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickCover = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      setCoverUrl(await uploadImage(user.id, file));
    } catch {
      setError("Couldn't upload the cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createCommunity({ name: name.trim(), description: description.trim(), category, coverUrl });
      navigate(`/community/${id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the community. Try again.");
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
        <p className="font-display text-base font-semibold text-ink">Create Community</p>
        <button
          onClick={handleCreate}
          disabled={!name.trim() || busy}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create
        </button>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePickCover(e.target.files?.[0])}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="relative mb-4 flex h-32 w-full items-center justify-center overflow-hidden rounded-3xl chip"
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-mist">
            {uploadingCover ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-[12px]">Add a cover photo</span>
          </span>
        )}
      </button>

      <div className="mb-4 flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl grad-primary glow-violet">
          <Users2 className="h-6 w-6 text-white" />
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Community name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bhutan Travel Hub"
            className="rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What's this community about?"
            className="resize-none rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Category</span>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  category === c ? "grad-primary text-white" : "chip text-mist"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-[12.5px] text-rose-400">{error}</p>}
    </div>
  );
}
