import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ArchiveRestore } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { listConversations, setConversationArchived, type ChatConversation } from "../../lib/api";

export function ArchivedChats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listConversations(user.id).then(setConversations).catch(() => setConversations([]));
  }, [user]);

  const archived = (conversations ?? []).filter((c) => c.archived && !c.is_self);

  const handleUnarchive = async (c: ChatConversation) => {
    if (!user) return;
    setConversations((prev) => (prev ? prev.map((x) => (x.id === c.id ? { ...x, archived: false } : x)) : prev));
    try {
      await setConversationArchived(user.id, c.id, false);
    } catch {
      listConversations(user.id).then(setConversations);
    }
  };

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Archived Chats</h1>
      </header>

      {conversations === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : archived.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-mist">No archived chats.</p>
      ) : (
        <div className="flex flex-col">
          {archived.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
              <button onClick={() => navigate(`/chat/${c.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Avatar name={c.other.name} avatarUrl={c.other.avatar_url} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{c.other.name}</p>
                  <p className="truncate text-[12px] text-mist">{c.last_message ?? "Say hello 👋"}</p>
                </div>
              </button>
              <button
                onClick={() => handleUnarchive(c)}
                className="flex shrink-0 items-center gap-1.5 rounded-full chip px-3 py-1.5 text-[11.5px] font-semibold text-ink"
              >
                <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
