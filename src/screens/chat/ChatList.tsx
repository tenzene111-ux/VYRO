import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SquarePen, Loader2, AtSign, MessageSquare as CommentIcon } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import {
  listConversations, listCommentsOnMyPosts, listMentionsOf,
  type ChatConversation, type CommentActivity, type MentionActivity,
} from "../../lib/api";

type Tab = "messages" | "comments" | "mentions";

export function ChatList() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("messages");
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [comments, setComments] = useState<CommentActivity[] | null>(null);
  const [mentions, setMentions] = useState<MentionActivity[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    listConversations(user.id).then(setConversations).catch(() => setConversations([]));
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "comments" || comments !== null) return;
    listCommentsOnMyPosts(user.id).then(setComments).catch(() => setComments([]));
  }, [user, tab, comments]);

  useEffect(() => {
    if (!user || !profile || tab !== "mentions" || mentions !== null) return;
    listMentionsOf(profile.username, user.id).then(setMentions).catch(() => setMentions([]));
  }, [user, profile, tab, mentions]);

  const filtered = (conversations ?? []).filter((c) =>
    c.other.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="px-4">
      <div className="mb-3 flex gap-2">
        {([
          ["messages", "Messages"],
          ["comments", "Comments"],
          ["mentions", "Mentions"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              tab === id ? "grad-primary text-white" : "chip text-mist"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "messages" && (
        <>
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="font-display text-sm font-semibold text-ink">No conversations yet</p>
              <p className="max-w-[240px] text-[12.5px] text-mist">
                Go to <span className="text-cyan-300">People</span> and message someone to start chatting.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/chat/${c.id}`)}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <Avatar name={c.other.name} avatarUrl={c.other.avatar_url} size={50} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{c.other.name}</p>
                    <p className="truncate text-[12.5px] text-mist">{c.last_message ?? "Say hello 👋"}</p>
                  </div>
                  {c.last_message_at && (
                    <span className="shrink-0 text-[11px] text-mist">{timeAgo(c.last_message_at)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "comments" &&
        (comments === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CommentIcon className="h-6 w-6 text-mist" />
            <p className="font-display text-sm font-semibold text-ink">No comments yet</p>
            <p className="max-w-[240px] text-[12.5px] text-mist">Comments on your posts will show up here.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {comments.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/profile/${c.author.id}`)}
                className="flex items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <Avatar name={c.author.name} avatarUrl={c.author.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink/90">
                    <span className="font-semibold text-ink">{c.author.name}</span> commented: {c.text}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-mist">on your post "{c.post_text || "…"}"</p>
                </div>
                <span className="shrink-0 text-[11px] text-mist">{timeAgo(c.created_at)}</span>
              </button>
            ))}
          </div>
        ))}

      {tab === "mentions" &&
        (mentions === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : mentions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <AtSign className="h-6 w-6 text-mist" />
            <p className="font-display text-sm font-semibold text-ink">No mentions yet</p>
            <p className="max-w-[240px] text-[12.5px] text-mist">When someone @mentions you, it'll show up here.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {mentions.map((m) => (
              <button
                key={`${m.kind}-${m.id}`}
                onClick={() => navigate(`/profile/${m.author.id}`)}
                className="flex items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <Avatar name={m.author.name} avatarUrl={m.author.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink/90">
                    <span className="font-semibold text-ink">{m.author.name}</span> mentioned you in a{" "}
                    {m.kind === "post" ? "post" : "comment"}: {m.text}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-mist">{timeAgo(m.created_at)}</span>
              </button>
            ))}
          </div>
        ))}
    </div>
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
