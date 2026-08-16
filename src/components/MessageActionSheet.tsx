import { Reply as ReplyIcon, Copy, Pencil, Trash2, Forward, Pin } from "lucide-react";
import type { ChatMessage } from "../lib/api";

export const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

export function MessageActionSheet({
  message,
  mine,
  onClose,
  onReply,
  onReact,
  onCopy,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onPin,
  onUnpin,
  onForward,
}: {
  message: ChatMessage;
  mine: boolean;
  onClose: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onForward: () => void;
}) {
  const canEdit = mine && !message.deleted_at && !message.audio_url;
  const act = (fn: () => void) => {
    fn();
    onClose();
  };
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-[440px] overflow-hidden rounded-3xl glass-strong">
        <div className="flex items-center justify-center gap-2 border-b border-white/10 px-3 py-3">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => act(() => onReact(emoji))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
        {!message.deleted_at && <SheetRow icon={ReplyIcon} label="Reply" onClick={() => act(onReply)} />}
        {!message.deleted_at && !message.audio_url && <SheetRow icon={Copy} label="Copy" onClick={() => act(onCopy)} />}
        {canEdit && <SheetRow icon={Pencil} label="Edit" onClick={() => act(onEdit)} />}
        {!message.deleted_at && <SheetRow icon={Forward} label="Forward" onClick={() => act(onForward)} />}
        {!message.deleted_at &&
          (message.pinned ? (
            <SheetRow icon={Pin} label="Unpin" onClick={() => act(onUnpin)} />
          ) : (
            <SheetRow icon={Pin} label="Pin" onClick={() => act(onPin)} />
          ))}
        <SheetRow icon={Trash2} label="Delete for me" danger onClick={() => act(onDeleteForMe)} />
        {mine && !message.deleted_at && <SheetRow icon={Trash2} label="Delete for everyone" danger onClick={() => act(onDeleteForEveryone)} />}
      </div>
    </>
  );
}

function SheetRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pin;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left text-[13.5px] font-medium last:border-b-0 hover:bg-white/5 ${
        danger ? "text-rose-400" : "text-ink"
      }`}
    >
      <Icon className="h-4.5 w-4.5" />
      {label}
    </button>
  );
}
