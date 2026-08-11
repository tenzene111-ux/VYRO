import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Video, PhoneMissed, PhoneOutgoing, PhoneIncoming, Loader2 } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import { listCallLogs, type CallLogEntry } from "../../lib/api";

const filters = ["All", "Missed"];

export function CallsTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startCall } = useCall();
  const [filter, setFilter] = useState("All");
  const [calls, setCalls] = useState<CallLogEntry[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listCallLogs(user.id).then(setCalls);
  }, [user]);

  const list = (calls ?? []).filter((c) => (filter === "Missed" ? c.outcome === "missed" || c.outcome === "declined" : true));

  const handleRedial = async (entry: CallLogEntry) => {
    await startCall(entry.other.id, entry.other.name, entry.kind as "voice" | "video");
    navigate(`/call/${entry.kind}/${entry.other.id}`, { state: { name: entry.other.name } });
  };

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

      {calls === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-mist">
          {filter === "Missed" ? "No missed calls." : "No calls yet — try calling someone from People."}
        </p>
      ) : (
        <div className="flex flex-col">
          {list.map((c) => {
            const missed = c.outcome === "missed" || c.outcome === "declined";
            const DirIcon = missed ? PhoneMissed : c.direction === "out" ? PhoneOutgoing : PhoneIncoming;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                <Avatar name={c.other.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{c.other.name}</p>
                  <p className={`flex items-center gap-1 text-[12px] ${missed ? "text-rose-400" : "text-mist"}`}>
                    <DirIcon className="h-3 w-3" />
                    {new Date(c.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <button
                  onClick={() => handleRedial(c)}
                  className="flex h-10 w-10 items-center justify-center rounded-full chip text-violet-300 active:scale-95 transition-transform"
                >
                  {c.kind === "video" ? <Video className="h-4.5 w-4.5" /> : <Phone className="h-4.5 w-4.5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
