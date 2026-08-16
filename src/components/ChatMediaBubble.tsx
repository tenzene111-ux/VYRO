import { FileText, Download } from "lucide-react";
import { formatBytes } from "../lib/format";
import type { ChatMessage } from "../lib/api";

export function ChatMediaBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  if (message.image_url) {
    return (
      <a href={message.image_url} target="_blank" rel="noreferrer" className="-mx-1 -mt-0.5 block">
        <img src={message.image_url} alt="" className="max-h-72 w-full rounded-2xl object-cover" />
      </a>
    );
  }
  if (message.video_url) {
    return (
      <video src={message.video_url} controls className="-mx-1 -mt-0.5 max-h-72 w-full rounded-2xl bg-black" />
    );
  }
  if (message.file_url) {
    return (
      <a
        href={message.file_url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${mine ? "bg-white/10" : "bg-white/10"}`}
      >
        <FileText className="h-6 w-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium">{message.file_name ?? "File"}</p>
          {message.file_size != null && <p className="text-[10.5px] opacity-70">{formatBytes(message.file_size)}</p>}
        </div>
        <Download className="h-4 w-4 shrink-0 opacity-70" />
      </a>
    );
  }
  return null;
}
