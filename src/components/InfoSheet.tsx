import { X } from "lucide-react";

export function InfoSheet({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[75vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl glass-strong p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink">{title}</p>
          <button onClick={onClose} className="rounded-full p-2 chip text-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink/85">{body}</p>
      </div>
    </div>
  );
}
