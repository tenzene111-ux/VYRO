import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronRight, Lock, Globe2, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { listDiscoverGroups, listMyGroups, joinGroup, type Group } from "../../lib/api";
import { gradientFor } from "../../lib/gradients";

const tabs = ["Your Groups", "Discover"];

export function GroupsTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("Your Groups");
  const [myGroups, setMyGroups] = useState<Group[] | null>(null);
  const [discover, setDiscover] = useState<Group[] | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    listMyGroups(user.id).then(setMyGroups);
    listDiscoverGroups(user.id).then(setDiscover);
  };

  useEffect(load, [user]);

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    setJoining(groupId);
    try {
      await joinGroup(groupId);
      load();
    } finally {
      setJoining(null);
    }
  };

  const list = tab === "Your Groups" ? myGroups : discover;

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

      {list === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-mist">
          {tab === "Your Groups" ? "You haven't joined any groups yet." : "No public groups to discover yet."}
        </p>
      ) : (
        <div className="flex flex-col">
          {list.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-2xl px-1 py-2.5">
              <button
                onClick={() => (tab === "Your Groups" ? navigate(`/chat/group/${g.id}`) : undefined)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="h-12 w-12 shrink-0 rounded-2xl" style={{ background: gradientFor(g.id) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{g.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-mist">
                    {g.privacy === "public" ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {g.privacy === "public" ? "Public" : "Private"} · {g.member_count.toLocaleString()} members
                  </p>
                </div>
              </button>
              {tab === "Your Groups" ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-mist" />
              ) : (
                <button
                  onClick={() => handleJoin(g.id)}
                  disabled={joining === g.id}
                  className="shrink-0 rounded-full grad-purple-blue px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {joining === g.id ? "…" : "Join"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
