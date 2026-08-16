import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Loader2, UserMinus, UserPlus } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth, type Profile } from "../context/AuthContext";
import { listProfiles, listCloseFriends, addCloseFriend, removeCloseFriend } from "../lib/api";

export function CloseFriends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [closeFriends, setCloseFriends] = useState<Profile[] | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[] | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listCloseFriends(user.id).then(setCloseFriends);
    listProfiles(user.id).then(setAllProfiles);
  }, [user]);

  const closeFriendIds = new Set((closeFriends ?? []).map((p) => p.id));
  const filtered = (allProfiles ?? []).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  const handleAdd = async (profile: Profile) => {
    if (!user) return;
    setBusyId(profile.id);
    setCloseFriends((prev) => (prev ? [...prev, profile] : [profile]));
    try {
      await addCloseFriend(user.id, profile.id);
    } catch {
      setCloseFriends((prev) => (prev ? prev.filter((p) => p.id !== profile.id) : prev));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (profile: Profile) => {
    if (!user) return;
    setBusyId(profile.id);
    setCloseFriends((prev) => (prev ? prev.filter((p) => p.id !== profile.id) : prev));
    try {
      await removeCloseFriend(user.id, profile.id);
    } catch {
      setCloseFriends((prev) => (prev ? [...prev, profile] : [profile]));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold text-ink">Close Friends</h1>
          <p className="text-[11.5px] text-mist">Share stories with only these people.</p>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2 rounded-2xl chip px-3.5 py-2.5">
        <Search className="h-4 w-4 text-mist" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
        />
      </div>

      {closeFriends && closeFriends.length > 0 && !query.trim() && (
        <div className="mb-5">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
            On your list · {closeFriends.length}
          </p>
          <div className="overflow-hidden rounded-2xl glass-card">
            {closeFriends.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-2.5 last:border-b-0">
                <Avatar name={p.name} avatarUrl={p.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                  <p className="truncate text-[11px] text-mist">@{p.username}</p>
                </div>
                <button
                  onClick={() => handleRemove(p)}
                  disabled={busyId === p.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-full chip px-3 py-1.5 text-[11.5px] font-semibold text-rose-400 disabled:opacity-50"
                >
                  <UserMinus className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-mist">{query.trim() ? "Results" : "Everyone else"}</p>
      <div className="overflow-hidden rounded-2xl glass-card">
        {allProfiles === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-mist" />
          </div>
        ) : filtered.filter((p) => !closeFriendIds.has(p.id)).length === 0 ? (
          <p className="px-3.5 py-4 text-center text-[12.5px] text-mist">No one to show.</p>
        ) : (
          filtered
            .filter((p) => !closeFriendIds.has(p.id))
            .map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-2.5 last:border-b-0">
                <Avatar name={p.name} avatarUrl={p.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                  <p className="truncate text-[11px] text-mist">@{p.username}</p>
                </div>
                <button
                  onClick={() => handleAdd(p)}
                  disabled={busyId === p.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-full grad-purple-blue px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
