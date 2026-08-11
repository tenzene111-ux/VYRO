import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, UserPlus, Loader2 } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth, type Profile } from "../../context/AuthContext";
import { getOrCreateConversationWith, listFollowing, listProfiles, toggleFollow } from "../../lib/api";

export function PeopleTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [messaging, setMessaging] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([listProfiles(user.id), listFollowing(user.id)]).then(([profiles, followingSet]) => {
      setPeople(profiles);
      setFollowing(followingSet);
    });
  }, [user]);

  const handleToggleFollow = async (targetId: string) => {
    if (!user) return;
    const isFollowingNow = following.has(targetId);
    setFollowing((prev) => {
      const next = new Set(prev);
      isFollowingNow ? next.delete(targetId) : next.add(targetId);
      return next;
    });
    try {
      await toggleFollow(user.id, targetId, isFollowingNow);
    } catch {
      setFollowing((prev) => {
        const next = new Set(prev);
        isFollowingNow ? next.add(targetId) : next.delete(targetId);
        return next;
      });
    }
  };

  const handleMessage = async (targetId: string) => {
    if (!user) return;
    setMessaging(targetId);
    try {
      const conversationId = await getOrCreateConversationWith(user.id, targetId);
      navigate(`/chat/${conversationId}`);
    } finally {
      setMessaging(null);
    }
  };

  if (people === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-mist" />
      </div>
    );
  }

  const followingList = people.filter((p) => following.has(p.id));
  const othersList = people.filter((p) => !following.has(p.id));

  return (
    <div className="px-4">
      {people.length === 0 && (
        <p className="py-16 text-center text-[13px] text-mist">No one else has joined VYRO yet.</p>
      )}

      {followingList.length > 0 && (
        <Section title="Following">
          <div className="flex flex-col">
            {followingList.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                <button onClick={() => navigate(`/profile/${u.id}`)}>
                  <Avatar name={u.name} size={48} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  <p className="text-[11px] text-mist">@{u.username}</p>
                </div>
                <button
                  onClick={() => handleMessage(u.id)}
                  disabled={messaging === u.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full chip text-violet-300 disabled:opacity-60"
                >
                  {messaging === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4.5 w-4.5" />}
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {othersList.length > 0 && (
        <Section title="People on VYRO">
          <div className="flex flex-col gap-2.5">
            {othersList.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl glass-card p-2.5">
                <button onClick={() => navigate(`/profile/${u.id}`)}>
                  <Avatar name={u.name} size={46} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  <p className="text-[11px] text-mist">@{u.username}</p>
                </div>
                <button
                  onClick={() => handleToggleFollow(u.id)}
                  className="flex items-center gap-1 rounded-full grad-purple-blue px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Follow
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}
