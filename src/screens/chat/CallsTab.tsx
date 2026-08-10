import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Video, PhoneMissed, PhoneOutgoing, PhoneIncoming } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { calls, byId } from "../../data/mock";

const filters = ["All", "Missed", "Voicemail"];

export function CallsTab() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const list = calls.filter((c) => (filter === "Missed" ? c.direction === "missed" : true));

  return (
    <div className="px-4">
      <div className="mb-3 flex gap-2 rounded-2xl chip p-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
              filter === f ? "grad-purple-blue text-white" : "text-mist"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {list.map((c) => {
          const user = byId(c.userId);
          const DirIcon = c.direction === "missed" ? PhoneMissed : c.direction === "out" ? PhoneOutgoing : PhoneIncoming;
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
              <Avatar name={user.name} size={48} online={user.online} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{user.name}</p>
                <p className={`flex items-center gap-1 text-[12px] ${c.direction === "missed" ? "text-rose-400" : "text-mist"}`}>
                  <DirIcon className="h-3 w-3" />
                  {c.time}
                </p>
              </div>
              <button
                onClick={() => navigate(c.type === "video" ? `/call/video/${c.userId}` : `/call/voice/${c.userId}`)}
                className="flex h-10 w-10 items-center justify-center rounded-full chip text-violet-300 active:scale-95 transition-transform"
              >
                {c.type === "video" ? <Video className="h-4.5 w-4.5" /> : <Phone className="h-4.5 w-4.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
