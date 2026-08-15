import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users2, Loader2 } from "lucide-react";
import { gradientFor } from "../lib/gradients";
import { useAuth } from "../context/AuthContext";
import { listCommunities, listMyCommunities, joinCommunity, leaveCommunity, type Community as CommunityRow } from "../lib/api";

export function Community() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [discover, setDiscover] = useState<CommunityRow[] | null>(null);
  const [mine, setMine] = useState<CommunityRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    listCommunities(user.id).then(setDiscover);
    listMyCommunities(user.id).then(setMine);
  };

  useEffect(load, [user]);

  const handleToggleJoin = async (c: CommunityRow) => {
    if (!user) return;
    setBusyId(c.id);
    try {
      if (c.my_role) await leaveCommunity(c.id);
      else await joinCommunity(c.id);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === "discover" ? discover : mine;

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-xl font-bold text-ink">Community</h1>
        </div>
        <button onClick={() => navigate("/create/community")} className="rounded-full p-2 chip text-mist">
          <Plus className="h-4.5 w-4.5" />
        </button>
      </header>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("discover")}
          className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
            tab === "discover" ? "grad-primary text-white" : "chip text-mist"
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
            tab === "mine" ? "grad-primary text-white" : "chip text-mist"
          }`}
        >
          My Communities
        </button>
      </div>

      {list === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">
            {tab === "mine" ? "You haven't joined any communities" : "No communities yet"}
          </p>
          <p className="max-w-[240px] text-[12.5px] text-mist">
            {tab === "mine" ? "Discover ones worth joining." : "Start the first one on VYRO."}
          </p>
          <button
            onClick={() => navigate("/create/community")}
            className="mt-2 rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white glow-violet"
          >
            Create Community
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-8">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/community/${c.id}`)}
              className="overflow-hidden rounded-3xl glass-card text-left"
            >
              <div className="relative h-24" style={c.cover_url ? {} : { background: gradientFor(c.id) }}>
                {c.cover_url && <img src={c.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              </div>
              <div className="flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl grad-purple-blue">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users2 className="h-5 w-5 text-white" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                  <p className="text-[11.5px] text-mist">
                    {c.member_count} {c.member_count === 1 ? "member" : "members"}
                    {c.category && ` · ${c.category}`}
                  </p>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleJoin(c);
                  }}
                  role="button"
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    busyId === c.id ? "opacity-50" : c.my_role ? "chip text-ink" : "grad-primary text-white"
                  }`}
                >
                  {c.my_role ? "Joined ✓" : "Join"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
