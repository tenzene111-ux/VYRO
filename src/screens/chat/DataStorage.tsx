import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { estimateStorage } from "../../lib/shorts/db";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function DataStorage() {
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null | undefined>(undefined);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    estimateStorage().then(setEstimate);
  }, []);

  const handleClearCache = () => {
    const prefixesToKeep = ["vyro-theme", "vyro_language", "vyro-translate-lang"];
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("vyro-") && !prefixesToKeep.some((p) => key.startsWith(p))) {
        localStorage.removeItem(key);
      }
    }
    setCleared(true);
    estimateStorage().then(setEstimate);
  };

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Data & storage</h1>
      </header>

      <div className="mb-5 overflow-hidden rounded-2xl glass-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-mist">Storage used by VYRO</p>
        {estimate === undefined ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-mist" />
          </div>
        ) : estimate === null ? (
          <p className="mt-2 text-[12.5px] text-mist">Your browser doesn't report storage usage.</p>
        ) : (
          <>
            <p className="mt-2 font-display text-2xl font-bold text-ink">{formatBytes(estimate.usage)}</p>
            <p className="text-[11.5px] text-mist">of {formatBytes(estimate.quota)} available</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full grad-primary"
                style={{ width: `${estimate.quota > 0 ? Math.min(100, (estimate.usage / estimate.quota) * 100) : 0}%` }}
              />
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleClearCache}
        className="flex w-full items-center justify-center gap-2 rounded-2xl chip py-3 text-sm font-semibold text-rose-400"
      >
        <Trash2 className="h-4.5 w-4.5" /> Clear local cache
      </button>
      <p className="mt-2 px-1 text-[11.5px] text-mist">
        Clears saved local preferences like your read-message and Following markers. Your posts, messages, and media
        stay safely on VYRO's servers — this only clears data cached on this device.
      </p>
      {cleared && <p className="mt-2 px-1 text-[12px] text-cyan-300">Local cache cleared.</p>}
    </div>
  );
}
