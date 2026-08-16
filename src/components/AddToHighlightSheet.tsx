import { useEffect, useState } from "react";
import { Loader2, Plus, Check } from "lucide-react";
import { listStoryHighlights, createStoryHighlight, addStoryToHighlight, type StoryHighlight } from "../lib/api";

export function AddToHighlightSheet({
  ownerId,
  imageUrl,
  videoUrl,
  caption,
  onClose,
}: {
  ownerId: string;
  imageUrl: string | null;
  videoUrl: string | null;
  caption: string | null;
  onClose: () => void;
}) {
  const [highlights, setHighlights] = useState<StoryHighlight[] | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    listStoryHighlights(ownerId).then(setHighlights);
  }, [ownerId]);

  const handleAddTo = async (highlightId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await addStoryToHighlight(highlightId, imageUrl, videoUrl, caption);
      setAddedId(highlightId);
      setTimeout(onClose, 700);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await createStoryHighlight(ownerId, title.trim(), imageUrl, videoUrl, caption);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-10 z-50 mx-auto max-h-[60vh] max-w-[440px] overflow-y-auto rounded-3xl bg-black/85 p-3 backdrop-blur">
        <p className="mb-2 px-1.5 py-1 text-[13px] font-semibold text-white">Add to Highlight</p>

        {creatingNew ? (
          <div className="p-1.5">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Highlight name"
              maxLength={30}
              className="mb-2 w-full rounded-xl bg-white/10 px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/50 focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setCreatingNew(false)} className="flex-1 rounded-full bg-white/10 py-2 text-[12.5px] font-medium text-white">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full grad-purple-blue py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setCreatingNew(true)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Plus className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-[13px] font-medium text-white">New Highlight</span>
            </button>

            {highlights === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-white/60" />
              </div>
            ) : (
              highlights.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleAddTo(h.id)}
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5 disabled:opacity-60"
                >
                  {h.cover_image_url ? (
                    <img src={h.cover_image_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">{h.title}</span>
                  {addedId === h.id && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                </button>
              ))
            )}
          </>
        )}
      </div>
    </>
  );
}
