import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Tag, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createListing } from "../lib/api";

const categories = ["General", "Electronics", "Fashion", "Home", "Vehicles", "Art"];

export function CreateListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    const priceValue = Number(price) || 0;
    setBusy(true);
    setError(null);
    try {
      await createListing(user.id, title.trim(), description.trim(), priceValue, category);
      navigate("/marketplace", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't publish this listing. Try again.");
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
        <p className="font-display text-base font-semibold text-ink">Sell an Item</p>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || busy}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          List
        </button>
      </header>

      <div className="flex flex-col items-center gap-3 py-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl grad-primary glow-violet">
          <Tag className="h-7 w-7 text-white" />
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you selling?"
            className="rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Price (USD)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            inputMode="decimal"
            className="rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Condition, details, anything a buyer should know..."
            className="resize-none rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Category</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  category === c ? "grad-purple-blue text-white" : "chip text-mist"
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
