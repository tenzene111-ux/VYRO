import { useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { subscribeToCreator } from "../lib/api";

export function SubscribeSheet({
  creatorId,
  creatorName,
  priceCoins,
  myCoins,
  onClose,
  onSubscribed,
}: {
  creatorId: string;
  creatorName: string;
  priceCoins: number;
  myCoins: number;
  onClose: () => void;
  onSubscribed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAfford = myCoins >= priceCoins;

  const handleSubscribe = async () => {
    if (!canAfford || busy) return;
    setBusy(true);
    setError(null);
    try {
      await subscribeToCreator(creatorId);
      onSubscribed();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't complete the subscription.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink">Subscribe to {creatorName}</p>
          <button onClick={onClose} className="rounded-full p-2 chip text-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[12px] text-mist">You have {myCoins.toLocaleString()} coins</p>

        <div className="mb-4 flex flex-col items-center gap-2 rounded-2xl glass-card py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="font-display text-2xl font-bold text-ink">🪙 {priceCoins.toLocaleString()}</p>
          <p className="text-[12px] text-mist">per month, renews when you subscribe again</p>
        </div>

        {error && <p className="mb-3 text-center text-[12.5px] text-rose-400">{error}</p>}
        {!canAfford && !error && <p className="mb-3 text-center text-[12.5px] text-amber-300">Not enough coins for this subscription.</p>}

        <button
          onClick={handleSubscribe}
          disabled={!canAfford || busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-full grad-purple-blue py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Subscribe for 🪙 {priceCoins.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
