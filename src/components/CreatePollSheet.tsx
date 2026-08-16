import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

export function CreatePollSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (question: string, options: string[], allowMultiple: boolean) => Promise<void>;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onCreate(
        question.trim(),
        options.map((o) => o.trim()).filter(Boolean),
        allowMultiple
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-h-[70vh] max-w-[440px] overflow-y-auto rounded-3xl glass-strong p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-ink">New poll</p>
          <button onClick={onClose} className="rounded-full p-1 text-mist hover:text-ink">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question"
          className="mb-3 w-full rounded-xl chip px-3.5 py-2.5 text-[13px] text-ink placeholder:text-mist focus:outline-none"
        />
        <div className="mb-2 flex flex-col gap-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-xl chip px-3.5 py-2 text-[12.5px] text-ink placeholder:text-mist focus:outline-none"
              />
              {options.length > 2 && (
                <button
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-full p-1.5 text-mist hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-cyan-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add option
          </button>
        )}
        <label className="mb-4 flex items-center justify-between rounded-xl chip px-3.5 py-2.5">
          <span className="text-[12.5px] text-ink">Allow multiple answers</span>
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
        </label>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex w-full items-center justify-center gap-1.5 rounded-full grad-purple-blue py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create poll
        </button>
      </div>
    </>
  );
}
