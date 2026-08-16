import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Avatar } from "./Avatar";
import { listProfiles } from "../lib/api";
import type { Profile } from "../context/AuthContext";

export function ContactPickerSheet({
  excludeId,
  onClose,
  onPick,
}: {
  excludeId: string;
  onClose: () => void;
  onPick: (profile: Profile) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listProfiles(excludeId).then(setProfiles).catch(() => setProfiles([]));
  }, [excludeId]);

  const filtered = (profiles ?? []).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-h-[65vh] max-w-[440px] overflow-hidden rounded-3xl glass-strong">
        <div className="border-b border-white/10 p-3">
          <p className="mb-2 px-1 text-[13px] font-semibold text-ink">Share a contact</p>
          <div className="flex items-center gap-2 rounded-xl chip px-3 py-2">
            <Search className="h-3.5 w-3.5 text-mist" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              className="flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-mist focus:outline-none"
            />
          </div>
        </div>
        <div className="max-h-[45vh] overflow-y-auto p-2">
          {profiles === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-mist" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-[12.5px] text-mist">No matches.</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
              >
                <Avatar name={p.name} avatarUrl={p.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                  <p className="truncate text-[11px] text-mist">@{p.username}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
