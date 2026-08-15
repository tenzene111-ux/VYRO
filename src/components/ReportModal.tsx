import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { submitReport, type ReportTargetType } from "../lib/api";

const reasons = ["Spam", "Harassment", "Hate speech", "Violence", "Nudity", "Scam", "Fake account", "Copyright", "Other"];

export function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setBusy(true);
    try {
      await submitReport({ reporterId: user.id, targetType, targetId, reason });
      setDone(true);
      setTimeout(onClose, 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl glass-strong p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink">Report</p>
          <button onClick={onClose} className="rounded-full p-2 chip text-mist">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <Check className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-ink">Thanks — we'll take a look.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`rounded-2xl px-4 py-3 text-left text-[13px] font-medium transition-colors ${
                    reason === r ? "grad-primary text-white" : "chip text-ink"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!reason || busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl grad-primary py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Report
            </button>
          </>
        )}
      </div>
    </div>
  );
}
