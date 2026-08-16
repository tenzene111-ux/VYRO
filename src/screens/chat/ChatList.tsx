import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SquarePen, Loader2, Bookmark, Archive, Folder, Star, Users, Bell, Briefcase, Settings2, MessageSquareText, UserPlus } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth, type Profile } from "../../context/AuthContext";
import {
  listConversations,
  getOrCreateSavedMessages,
  getOrCreateConversationWith,
  setConversationArchived,
  listChatFolders,
  searchPeopleAndPosts,
  searchGroups,
  searchMyMessages,
  joinGroup,
  type ChatConversation,
  type ChatFolder,
  type Group,
  type MessageSearchHit,
} from "../../lib/api";

const ICONS: Record<string, typeof Folder> = { folder: Folder, star: Star, users: Users, bell: Bell, briefcase: Briefcase };

type SearchResults = { people: Profile[]; groups: (Group & { isMember: boolean })[]; messages: MessageSearchHit[] };

export function ChatList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<ChatConversation | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    listConversations(user.id).then(setConversations).catch(() => setConversations([]));
    listChatFolders(user.id).then(setFolders).catch(() => setFolders([]));
  }, [user]);

  useEffect(() => {
    const q = query.trim();
    if (!q || !user) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      Promise.all([searchPeopleAndPosts(user.id, q), searchGroups(user.id, q), searchMyMessages(user.id, q)])
        .then(([{ people }, groups, messages]) => setSearchResults({ people, groups, messages }))
        .catch(() => setSearchResults({ people: [], groups: [], messages: [] }))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user]);

  const savedMessages = (conversations ?? []).find((c) => c.is_self) ?? null;
  const archivedCount = (conversations ?? []).filter((c) => c.archived && !c.is_self).length;
  const activeCustomFolder = folders.find((f) => f.id === activeFolder) ?? null;
  const activeFolderIds = activeCustomFolder ? new Set(activeCustomFolder.conversationIds) : null;

  const filtered = (conversations ?? [])
    .filter((c) => !c.is_self && !c.archived)
    .filter((c) => c.other.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((c) => {
      if (query.trim()) return true; // search spans every folder
      if (activeFolder === "all") return true;
      if (activeFolder === "unread") return c.unread;
      return activeFolderIds?.has(c.id) ?? true;
    });

  const openSavedMessages = async () => {
    if (!user) return;
    if (savedMessages) {
      navigate(`/chat/${savedMessages.id}`);
      return;
    }
    const id = await getOrCreateSavedMessages(user.id);
    navigate(`/chat/${id}`);
  };

  const handleMessagePerson = async (person: Profile) => {
    if (!user) return;
    const id = await getOrCreateConversationWith(user.id, person.id);
    navigate(`/chat/${id}`);
  };

  const handleOpenGroup = async (group: Group & { isMember: boolean }) => {
    if (!group.isMember) await joinGroup(group.id).catch(() => {});
    navigate(`/chat/group/${group.id}`);
  };

  const handleOpenMessageHit = (hit: MessageSearchHit) => {
    const path = hit.isGroup ? `/chat/group/${hit.groupId}` : `/chat/${hit.conversationId}`;
    navigate(path, { state: { scrollToMessageId: hit.messageId } });
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

      {!query.trim() && (
        <div className="no-scrollbar mb-3 flex items-center gap-2 overflow-x-auto">
          <FolderChip label="All" active={activeFolder === "all"} onClick={() => setActiveFolder("all")} />
          <FolderChip label="Unread" active={activeFolder === "unread"} onClick={() => setActiveFolder("unread")} />
          {folders.map((f) => {
            const Icon = ICONS[f.icon] ?? Folder;
            return (
              <FolderChip key={f.id} label={f.name} icon={Icon} active={activeFolder === f.id} onClick={() => setActiveFolder(f.id)} />
            );
          })}
          <button
            onClick={() => navigate("/chat/folders")}
            className="flex shrink-0 items-center justify-center rounded-full chip p-2 text-mist"
            title="Manage folders"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {query.trim() ? (
        searching && !searchResults ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filtered.length > 0 && (
              <div>
                <SearchSectionHeader label="Chats" />
                <div className="flex flex-col">
                  {filtered.map((c) => (
                    <ConversationRow key={c.id} conversation={c} onOpen={() => navigate(`/chat/${c.id}`)} onLongPress={() => setArchiveTarget(c)} />
                  ))}
                </div>
              </div>
            )}

            {searchResults && searchResults.messages.length > 0 && (
              <div>
                <SearchSectionHeader label="Messages" />
                <div className="overflow-hidden rounded-2xl glass-card">
                  {searchResults.messages.map((hit) => (
                    <button
                      key={hit.messageId}
                      onClick={() => handleOpenMessageHit(hit)}
                      className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-white/5"
                    >
                      {hit.isGroup ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full chip text-mist">
                          <Users className="h-4 w-4" />
                        </div>
                      ) : (
                        <Avatar name={hit.title} avatarUrl={hit.avatarUrl} size={36} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-ink">{hit.title}</p>
                        <p className="truncate text-[12px] text-mist">{hit.snippet}</p>
                      </div>
                      <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-mist" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchResults && searchResults.groups.length > 0 && (
              <div>
                <SearchSectionHeader label="Groups" />
                <div className="overflow-hidden rounded-2xl glass-card">
                  {searchResults.groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-2.5 last:border-b-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full chip text-mist">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-ink">{g.name}</p>
                        <p className="text-[11px] text-mist">{g.member_count.toLocaleString()} members</p>
                      </div>
                      <button
                        onClick={() => handleOpenGroup(g)}
                        className="shrink-0 rounded-full chip px-3 py-1.5 text-[11.5px] font-semibold text-ink"
                      >
                        {g.isMember ? "Open" : "Join"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults && searchResults.people.length > 0 && (
              <div>
                <SearchSectionHeader label="People" />
                <div className="overflow-hidden rounded-2xl glass-card">
                  {searchResults.people.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-2.5 last:border-b-0">
                      <Avatar name={p.name} avatarUrl={p.avatar_url} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-ink">{p.name}</p>
                        <p className="truncate text-[11px] text-mist">@{p.username}</p>
                      </div>
                      <button
                        onClick={() => handleMessagePerson(p)}
                        className="flex shrink-0 items-center gap-1 rounded-full chip px-3 py-1.5 text-[11.5px] font-semibold text-ink"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Message
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 &&
              (!searchResults || (searchResults.messages.length === 0 && searchResults.groups.length === 0 && searchResults.people.length === 0)) && (
                <p className="py-16 text-center text-[13px] text-mist">No results for "{query.trim()}"</p>
              )}
          </div>
        )
      ) : conversations === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : (
        <div className="flex flex-col">
          {!query.trim() && activeFolder === "all" && (
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

          {!query.trim() && activeFolder === "all" && archivedCount > 0 && (
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

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="font-display text-sm font-semibold text-ink">
                {activeFolder === "all" ? "No conversations yet" : activeFolder === "unread" ? "You're all caught up" : "No chats in this folder"}
              </p>
              {activeFolder === "all" && (
                <p className="max-w-[240px] text-[12.5px] text-mist">
                  Go to <span className="text-cyan-300">People</span> and message someone to start chatting.
                </p>
              )}
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

function SearchSectionHeader({ label }: { label: string }) {
  return <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-mist">{label}</p>;
}

function FolderChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon?: typeof Folder;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
        active ? "grad-purple-blue text-white" : "chip text-mist"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </button>
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
        <p className={`truncate text-[14px] ${conversation.unread ? "font-bold text-ink" : "font-semibold text-ink"}`}>
          {conversation.other.name}
        </p>
        <p className={`truncate text-[12.5px] ${conversation.unread ? "text-ink/80" : "text-mist"}`}>
          {conversation.last_message ?? "Say hello 👋"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {conversation.last_message_at && <span className="text-[11px] text-mist">{timeAgo(conversation.last_message_at)}</span>}
        {conversation.unread && <span className="h-2 w-2 rounded-full bg-cyan-400" />}
      </div>
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
