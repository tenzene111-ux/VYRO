import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight, Lock, Globe2, Loader2, Radio } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  listDiscoverGroups,
  listMyGroups,
  joinGroup,
  listMyChannels,
  listDiscoverChannels,
  joinChannel,
  type Group,
  type Channel,
} from "../../lib/api";
import { gradientFor } from "../../lib/gradients";

const kinds = ["Groups", "Channels"] as const;
const subTabs = ["Yours", "Discover"];

export function GroupsTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kind, setKind] = useState<(typeof kinds)[number]>("Groups");
  const [tab, setTab] = useState("Yours");
  const [myGroups, setMyGroups] = useState<Group[] | null>(null);
  const [discoverGroups, setDiscoverGroups] = useState<Group[] | null>(null);
  const [myChannels, setMyChannels] = useState<Channel[] | null>(null);
  const [discoverChannels, setDiscoverChannels] = useState<Channel[] | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    listMyGroups(user.id).then(setMyGroups);
    listDiscoverGroups(user.id).then(setDiscoverGroups);
    listMyChannels(user.id).then(setMyChannels);
    listDiscoverChannels(user.id).then(setDiscoverChannels);
  };

  useEffect(load, [user]);

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    setJoining(groupId);
    try {
      await joinGroup(groupId);
      load();
    } finally {
      setJoining(null);
    }
  };

  const handleJoinChannel = async (channelId: string) => {
    if (!user) return;
    setJoining(channelId);
    try {
      await joinChannel(channelId);
      load();
    } finally {
      setJoining(null);
    }
  };

  const groupList = tab === "Yours" ? myGroups : discoverGroups;
  const channelList = tab === "Yours" ? myChannels : discoverChannels;

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-ink">{kind}</h1>
        <button
          onClick={() => navigate(kind === "Groups" ? "/create/group" : "/create/channel")}
          className="rounded-full p-2 chip text-mist"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              kind === k ? "grad-purple-blue text-white" : "chip text-mist"
            }`}
          >
            {k === "Channels" && <Radio className="h-3 w-3" />}
            {k}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        {subTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "chip text-cyan-300" : "chip text-mist"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {kind === "Groups" ? (
        groupList === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : groupList.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-mist">
            {tab === "Yours" ? "You haven't joined any groups yet." : "No public groups to discover yet."}
          </p>
        ) : (
          <div className="flex flex-col">
            {groupList.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-2xl px-1 py-2.5">
                <button
                  onClick={() => (tab === "Yours" ? navigate(`/chat/group/${g.id}`) : undefined)}
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
                {tab === "Yours" ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-mist" />
                ) : (
                  <button
                    onClick={() => handleJoinGroup(g.id)}
                    disabled={joining === g.id}
                    className="shrink-0 rounded-full grad-purple-blue px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {joining === g.id ? "…" : "Join"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : channelList === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : channelList.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-mist">
          {tab === "Yours" ? "You haven't subscribed to any channels yet." : "No public channels to discover yet."}
        </p>
      ) : (
        <div className="flex flex-col">
          {channelList.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl px-1 py-2.5">
              <button
                onClick={() => (tab === "Yours" ? navigate(`/chat/channel/${c.id}`) : undefined)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: gradientFor(c.id) }}>
                  <Radio className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-mist">
                    {c.privacy === "public" ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {c.privacy === "public" ? "Public" : "Private"} · {c.subscriber_count.toLocaleString()} subscribers
                  </p>
                </div>
              </button>
              {tab === "Yours" ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-mist" />
              ) : (
                <button
                  onClick={() => handleJoinChannel(c.id)}
                  disabled={joining === c.id}
                  className="shrink-0 rounded-full grad-purple-blue px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {joining === c.id ? "…" : "Subscribe"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
