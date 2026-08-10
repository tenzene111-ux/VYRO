import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronRight, Lock, Globe2 } from "lucide-react";
import { groups } from "../../data/mock";
import { gradientFor } from "../../lib/gradients";

const tabs = ["Your Groups", "Discover"];

export function GroupsTab() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Your Groups");

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-ink">Groups</h1>
        <div className="flex gap-1">
          <button onClick={() => navigate("/create/group")} className="rounded-full p-2 chip text-mist">
            <Plus className="h-4.5 w-4.5" />
          </button>
          <button className="rounded-full p-2 chip text-mist">
            <Search className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "grad-purple-blue text-white" : "chip text-mist"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => navigate(`/chat/group/${g.id}`)}
            className="flex items-center gap-3 rounded-2xl px-1 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="h-12 w-12 shrink-0 rounded-2xl" style={{ background: gradientFor(g.id) }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{g.name}</p>
              <p className="flex items-center gap-1 text-[11px] text-mist">
                {g.privacy === "Public" ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {g.privacy} · {g.members.toLocaleString()} members
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-mist" />
          </button>
        ))}
      </div>
    </div>
  );
}
