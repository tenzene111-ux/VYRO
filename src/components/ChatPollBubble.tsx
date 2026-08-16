import { BarChart3, Check } from "lucide-react";
import type { Poll } from "../lib/api";

export function ChatPollBubble({
  poll,
  mine,
  userId,
  onVote,
  onClose,
}: {
  poll: Poll;
  mine: boolean;
  userId: string;
  onVote: (optionIds: string[]) => void;
  onClose: () => void;
}) {
  const myVoteIds = poll.votes.filter((v) => v.user_id === userId).map((v) => v.option_id);
  const totalVoters = new Set(poll.votes.map((v) => v.user_id)).size;
  const isCreator = poll.creator_id === userId;

  const handleTap = (optionId: string) => {
    if (poll.closed) return;
    if (poll.allow_multiple) {
      const next = myVoteIds.includes(optionId) ? myVoteIds.filter((id) => id !== optionId) : [...myVoteIds, optionId];
      onVote(next);
    } else {
      onVote(myVoteIds.includes(optionId) ? [] : [optionId]);
    }
  };

  return (
    <div className="min-w-[220px]">
      <p className={`mb-2 flex items-center gap-1.5 text-[13px] font-semibold ${mine ? "text-white" : "text-ink"}`}>
        <BarChart3 className="h-3.5 w-3.5 shrink-0" /> {poll.question}
      </p>
      <div className="flex flex-col gap-1.5">
        {poll.options.map((opt) => {
          const count = poll.votes.filter((v) => v.option_id === opt.id).length;
          const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
          const voted = myVoteIds.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => handleTap(opt.id)}
              disabled={poll.closed}
              className={`relative overflow-hidden rounded-xl px-3 py-2 text-left text-[12.5px] ${
                mine ? "bg-white/10" : "bg-black/10"
              } disabled:cursor-default`}
            >
              <div className={`absolute inset-y-0 left-0 ${mine ? "bg-white/15" : "bg-cyan-400/15"}`} style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {voted && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{opt.text}</span>
                </span>
                <span className="shrink-0 opacity-70">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className={`mt-2 text-[10.5px] ${mine ? "text-white/70" : "text-mist"}`}>
        {totalVoters} vote{totalVoters === 1 ? "" : "s"} · {poll.allow_multiple ? "Multiple choice" : "Single choice"}
        {poll.closed && " · Final results"}
      </p>
      {isCreator && !poll.closed && (
        <button onClick={onClose} className={`mt-1.5 text-[10.5px] font-semibold underline ${mine ? "text-white/80" : "text-cyan-300"}`}>
          Close poll
        </button>
      )}
    </div>
  );
}
