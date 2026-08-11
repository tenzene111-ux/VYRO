import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, Image as ImageIcon, XCircle } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { createPost } from "../lib/api";
import { uploadImage } from "../lib/storage";

export function CreatePost() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async () => {
    if (!user || (!text.trim() && !imageFile)) return;
    setPosting(true);
    setError(null);
    try {
      let imageUrl: string | undefined;
      if (imageFile) imageUrl = await uploadImage(user.id, imageFile);
      await createPost(user.id, text.trim(), imageUrl);
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
          disabled={(!text.trim() && !imageFile) || posting}
          onClick={handlePost}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {posting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Post
        </button>
      </header>

      <div className="flex items-center gap-3 px-4 pb-3">
        <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={42} />
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
        rows={5}
        className="mx-4 resize-none bg-transparent text-[15px] text-ink placeholder:text-mist/70 focus:outline-none"
      />

      {imagePreview && (
        <div className="relative mx-4 mb-3 overflow-hidden rounded-2xl">
          <img src={imagePreview} alt="Selected" className="max-h-80 w-full object-cover" />
          <button
            onClick={removeImage}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white backdrop-blur"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="mx-4 mb-6 mt-auto">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2.5 rounded-xl chip px-3.5 py-2.5 text-[13px] font-medium text-ink/85"
        >
          <ImageIcon className="h-4.5 w-4.5 text-emerald-400" />
          Photo
        </button>
      </div>

      {error && <p className="mx-4 mb-4 text-[12.5px] text-rose-400">{error}</p>}
    </div>
  );
}
