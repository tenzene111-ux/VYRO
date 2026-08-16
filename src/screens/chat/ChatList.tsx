import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SquarePen, Loader2, Bookmark, Archive } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { listConversations, getOrCreateSavedMessages, setConversationArchived, type ChatConversation } from "../../lib/api";

export function ChatList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [query, setQuery] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<ChatConversation | null>(null);

  useEffect(() => {
    if (!user) return;
    listConversations(user.id).then(setConversations).catch(() => setConversations([]));
  }, [user]);

  const savedMessages = (conversations ?? []).find((c) => c.is_self) ?? null;
  const archivedCount = (conversations ?? []).filter((c) => c.archived && !c.is_self).length;
  const filtered = (conversations ?? []).filter(
    (c) => !c.is_self && !c.archived && c.other.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const openSavedMessages = async () => {
    if (!user) return;
    if (savedMessages) {
      navigate(`/chat/${savedMessages.id}`);
      return;
    }
    const id = await getOrCreateSavedMessages(user.id);
    navigate(`/chat/${id}`);
  };

  const handleArchive = async () => {
    if (!user || !archiveTarget) return;
    const target = archiveTarget;
    setArchiveTarget(null);
    setConversations((prev) => (prev ? prev.map((c) => (c.id === target.id ? { ...c, archived: true } : c)) : prev));
    try {
      await setConversationArchived(user.id, target.id, true);
    } catch {
      listConversations(user.id).then(setConversations);
    }
  };

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl chip px-3.5 py-2.5">
          <Search className="h-4 w-4 text-mist" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </div>
        <button onClick={() => navigate("/chat/people")} className="rounded-full p-2.5 chip text-mist">
          <SquarePen className="h-4.5 w-4.5" />
        </button>
      </div>

      {conversations === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : (
        <div className="flex flex-col">
          {!query.trim() && (
            <button
              onClick={openSavedMessages}
              className="flex items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full grad-purple-blue">
                <Bookmark className="h-5 w-5 text-white" fill="currentColor" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">Saved Messages</p>
                <p className="truncate text-[12.5px] text-mist">{savedMessages?.last_message ?? "Notes and messages to yourself"}</p>
              </div>
              {savedMessages?.last_message_at && (
                <span className="shrink-0 text-[11px] text-mist">{timeAgo(savedMessages.last_message_at)}</span>
              )}
            </button>
          )}

          {!query.trim() && archivedCount > 0 && (
            <button
              onClick={() => navigate("/chat/archived")}
              className="flex items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full chip">
                <Archive className="h-5 w-5 text-mist" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">Archived Chats</p>
                <p className="truncate text-[12.5px] text-mist">
                  {archivedCount} conversation{archivedCount === 1 ? "" : "s"}
                </p>
              </div>
            </button>
          )}

          {filtered.length === 0 && !savedMessages && archivedCount === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="font-display text-sm font-semibold text-ink">No conversations yet</p>
              <p className="max-w-[240px] text-[12.5px] text-mist">
                Go to <span className="text-cyan-300">People</span> and message someone to start chatting.
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <ConversationRow key={c.id} conversation={c} onOpen={() => navigate(`/chat/${c.id}`)} onLongPress={() => setArchiveTarget(c)} />
            ))
          )}
        </div>
      )}

      {archiveTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setArchiveTarget(null)} />
          <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-[440px] overflow-hidden rounded-3xl glass-strong">
            <button
              onClick={handleArchive}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[13.5px] font-medium text-ink hover:bg-white/5"
            >
              <Archive className="h-4.5 w-4.5" /> Archive chat
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  onOpen,
  onLongPress,
}: {
  conversation: ChatConversation;
  onOpen: () => void;
  onLongPress: () => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <button
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!longPressed.current) onOpen();
      }}
      className="flex select-none items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
    >
      <Avatar name={conversation.other.name} avatarUrl={conversation.other.avatar_url} size={50} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{conversation.other.name}</p>
        <p className="truncate text-[12.5px] text-mist">{conversation.last_message ?? "Say hello 👋"}</p>
      </div>
      {conversation.last_message_at && (
        <span className="shrink-0 text-[11px] text-mist">{timeAgo(conversation.last_message_at)}</span>
      )}
    </button>
  );
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
