import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Camera, SquarePen, Pin, BellOff, Mic } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { conversations, byId } from "../../data/mock";

const filters = ["All", "Unread", "Groups", "Channels"];

export function ChatList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const list = conversations.filter((c) => (filter === "Unread" ? c.unread > 0 : true));

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl chip px-3.5 py-2.5">
          <Search className="h-4 w-4 text-mist" />
          <input
            placeholder="Search messages"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </div>
        <button className="rounded-full p-2.5 chip text-mist">
          <Camera className="h-4.5 w-4.5" />
        </button>
        <button className="rounded-full p-2.5 chip text-mist">
          <SquarePen className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "grad-purple-blue text-white" : "chip text-mist"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {list.map((c) => {
          const user = byId(c.userId);
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/chat/${c.id}`)}
              className="flex items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <Avatar name={user.name} size={50} online={user.online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[14px] font-semibold text-ink">{user.name}</p>
                  {c.pinned && <Pin className="h-3 w-3 shrink-0 text-mist" />}
                  {c.muted && <BellOff className="h-3 w-3 shrink-0 text-mist" />}
                </div>
                <p className="flex items-center gap-1 truncate text-[12.5px] text-mist">
                  {c.kind === "voice" && <Mic className="h-3 w-3 shrink-0 text-violet-400" />}
                  <span className="truncate">{c.lastMessage}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] text-mist">{c.time}</span>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full grad-primary px-1.5 text-[10px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
