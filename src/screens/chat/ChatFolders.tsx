import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Check, Folder, Star, Users, Bell, Briefcase } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import {
  listConversations,
  listChatFolders,
  createChatFolder,
  updateChatFolder,
  deleteChatFolder,
  type ChatConversation,
  type ChatFolder,
} from "../../lib/api";

const ICONS: Record<string, typeof Folder> = { folder: Folder, star: Star, users: Users, bell: Bell, briefcase: Briefcase };
const ICON_KEYS = Object.keys(ICONS);

export function ChatFolders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [folders, setFolders] = useState<ChatFolder[] | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [editing, setEditing] = useState<ChatFolder | "new" | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!user) return;
    listChatFolders(user.id).then(setFolders);
    listConversations(user.id).then(setConversations);
  };

  useEffect(load, [user]);

  const startNew = () => {
    setName("");
    setIcon("folder");
    setSelectedIds(new Set());
    setEditing("new");
  };

  const startEdit = (folder: ChatFolder) => {
    setName(folder.name);
    setIcon(folder.icon);
    setSelectedIds(new Set(folder.conversationIds));
    setEditing(folder);
  };

  const toggleConversation = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || !name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing === "new") {
        await createChatFolder(user.id, name.trim(), icon, [...selectedIds]);
      } else if (editing) {
        await updateChatFolder(editing.id, name.trim(), icon, [...selectedIds]);
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (folder: ChatFolder) => {
    if (!window.confirm(`Delete the "${folder.name}" folder?`)) return;
    setFolders((prev) => (prev ? prev.filter((f) => f.id !== folder.id) : prev));
    try {
      await deleteChatFolder(folder.id);
    } catch {
      load();
    }
  };

  if (editing) {
    const Icon = ICONS[icon];
    return (
      <div className="px-4 safe-top">
        <header className="flex items-center gap-3 py-4">
          <button onClick={() => setEditing(null)} className="rounded-full p-1.5 text-mist hover:text-ink">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-ink">{editing === "new" ? "New folder" : "Edit folder"}</h1>
        </header>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="mb-3 w-full rounded-xl chip px-3.5 py-2.5 text-[13px] text-ink placeholder:text-mist focus:outline-none"
        />

        <div className="mb-4 flex items-center gap-2">
          {ICON_KEYS.map((key) => {
            const Opt = ICONS[key];
            return (
              <button
                key={key}
                onClick={() => setIcon(key)}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  icon === key ? "grad-purple-blue text-white" : "chip text-mist"
                }`}
              >
                <Opt className="h-4.5 w-4.5" />
              </button>
            );
          })}
        </div>

        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-mist">Include chats</p>
        <div className="mb-6 overflow-hidden rounded-2xl glass-card">
          {conversations === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-mist" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3.5 py-3 text-[12.5px] text-mist">No chats yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleConversation(c.id)}
                className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-white/5"
              >
                <Avatar name={c.is_self ? "Saved Messages" : c.other.name} avatarUrl={c.is_self ? undefined : c.other.avatar_url} size={36} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{c.is_self ? "Saved Messages" : c.other.name}</span>
                {selectedIds.has(c.id) && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full grad-purple-blue">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex w-full items-center justify-center gap-1.5 rounded-full grad-purple-blue py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {Icon && <Icon className="h-4 w-4" />}
          Save folder
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Chat folders</h1>
      </header>

      <button
        onClick={startNew}
        className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-full grad-purple-blue py-2.5 text-[13px] font-semibold text-white"
      >
        <Plus className="h-4 w-4" /> New folder
      </button>

      {folders === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : folders.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-mist">
          No folders yet. Create one to organize your chats — e.g. "Work" or "Close friends".
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl glass-card">
          {folders.map((f) => {
            const Icon = ICONS[f.icon] ?? Folder;
            return (
              <div key={f.id} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-b-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full chip text-cyan-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{f.name}</p>
                  <p className="text-[11px] text-mist">
                    {f.conversationIds.length} chat{f.conversationIds.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button onClick={() => startEdit(f)} className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-ink">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(f)} className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-rose-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
