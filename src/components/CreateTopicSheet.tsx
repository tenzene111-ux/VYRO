import { useState } from "react";
import { Loader2 } from "lucide-react";

const ICON_OPTIONS = ["💬", "📢", "🎉", "❓", "💡", "🐛", "📌", "🔥"];

export function CreateTopicSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, icon: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(name.trim(), icon);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-[440px] overflow-hidden rounded-3xl glass-strong p-4">
        <p className="mb-3 text-[14px] font-semibold text-ink">New topic</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Topic name"
          maxLength={30}
          className="mb-3 w-full rounded-xl chip px-3.5 py-2.5 text-[13px] text-ink placeholder:text-mist focus:outline-none"
        />
        <div className="mb-4 flex items-center gap-2">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setIcon(opt)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${icon === opt ? "grad-purple-blue" : "chip"}`}
            >
              {opt}
            </button>
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={!name.trim() || busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-full grad-purple-blue py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Create topic
        </button>
      </div>
    </>
  );
}
