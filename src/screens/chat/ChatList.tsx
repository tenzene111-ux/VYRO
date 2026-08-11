import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SquarePen, Loader2 } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { listConversations, type ChatConversation } from "../../lib/api";

export function ChatList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    listConversations(user.id).then(setConversations).catch(() => setConversations([]));
  }, [user]);

  const filtered = (conversations ?? []).filter((c) =>
    c.other.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl chip px-3.5 py-2.5">
          <Search className="h-4 w-4 text-mist" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </div>
        <button onClick={() => navigate("/chat/people")} className="rounded-full p-2.5 chip text-mist">
          <SquarePen className="h-4.5 w-4.5" />
        </button>
      </div>

      {conversations === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">No conversations yet</p>
          <p className="max-w-[240px] text-[12.5px] text-mist">
            Go to <span className="text-cyan-300">People</span> and message someone to start chatting.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/chat/${c.id}`)}
              className="flex items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <Avatar name={c.other.name} size={50} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{c.other.name}</p>
                <p className="truncate text-[12.5px] text-mist">{c.last_message ?? "Say hello 👋"}</p>
              </div>
              {c.last_message_at && (
                <span className="shrink-0 text-[11px] text-mist">{timeAgo(c.last_message_at)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
