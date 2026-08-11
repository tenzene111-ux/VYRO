import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { giftCatalog } from "../data/mock";
import { sendGift } from "../lib/api";

export function GiftPicker({
  receiverId,
  receiverName,
  myCoins,
  liveId,
  onClose,
  onSent,
}: {
  receiverId: string;
  receiverName: string;
  myCoins: number;
  liveId?: string;
  onClose: () => void;
  onSent: (giftKey: string, giftEmoji: string) => void;
}) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (giftId: string, price: number, emoji: string) => {
    setError(null);
    if (price > myCoins) {
      setError("Not enough coins for this gift.");
      return;
    }
    setSendingId(giftId);
    try {
      await sendGift(receiverId, giftId, price, liveId);
      onSent(giftId, emoji);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the gift.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink">Send a Gift to {receiverName}</p>
          <button onClick={onClose} className="rounded-full p-2 chip text-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[12px] text-mist">You have {myCoins.toLocaleString()} coins</p>

        {error && <p className="mb-3 text-[12.5px] text-rose-400">{error}</p>}

        <div className="grid grid-cols-3 gap-2.5">
          {giftCatalog.map((g) => (
            <button
              key={g.id}
              onClick={() => handleSend(g.id, g.price, g.emoji)}
              disabled={sendingId !== null}
              className="flex flex-col items-center gap-1 rounded-2xl glass-card p-3 disabled:opacity-50"
            >
              {sendingId === g.id ? (
                <Loader2 className="h-6 w-6 animate-spin text-mist" />
              ) : (
                <span className="text-2xl">{g.emoji}</span>
              )}
              <span className="text-[11px] font-medium text-ink">{g.name}</span>
              <span className="text-[10px] text-amber-300">🪙 {g.price}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
