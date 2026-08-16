import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, UserPlus, Gift, Loader2, X, AtSign, Sparkles } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import {
  deleteNotification,
  listCommentsOnMyPosts,
  listFollowing,
  listMentionsOf,
  listNotifications,
  markAllNotificationsRead,
  subscribeToNotifications,
  toggleFollow,
  type CommentActivity,
  type MentionActivity,
  type NotificationRow,
} from "../lib/api";

type Tab = "all" | "comments" | "mentions";

const iconFor: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  gift: Gift,
  subscription: Sparkles,
};

const colorFor: Record<string, string> = {
  like: "text-rose-400",
  comment: "text-cyan-400",
  follow: "text-blue-400",
  gift: "text-amber-300",
  subscription: "text-violet-300",
};

const textFor: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  gift: "sent you a gift 🎁",
  subscription: "subscribed to you ✨",
};

export function Notifications() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<CommentActivity[] | null>(null);
  const [mentions, setMentions] = useState<MentionActivity[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listNotifications(user.id).then(setNotifications);
    listFollowing(user.id).then(setFollowingIds);
    markAllNotificationsRead(user.id);
    const unsubscribe = subscribeToNotifications(user.id, () => {
      listNotifications(user.id).then(setNotifications);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "comments" || comments !== null) return;
    listCommentsOnMyPosts(user.id).then(setComments).catch(() => setComments([]));
  }, [user, tab, comments]);

  useEffect(() => {
    if (!user || !profile || tab !== "mentions" || mentions !== null) return;
    listMentionsOf(profile.username, user.id).then(setMentions).catch(() => setMentions([]));
  }, [user, profile, tab, mentions]);

  const handleFollowBack = async (actorId: string) => {
    if (!user) return;
    const alreadyFollowing = followingIds.has(actorId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (alreadyFollowing) next.delete(actorId);
      else next.add(actorId);
      return next;
    });
    try {
      await toggleFollow(user.id, actorId, alreadyFollowing);
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (alreadyFollowing) next.add(actorId);
        else next.delete(actorId);
        return next;
      });
    }
  };

  const handleIgnore = async (notificationId: string) => {
    setNotifications((prev) => (prev ? prev.filter((n) => n.id !== notificationId) : prev));
    try {
      await deleteNotification(notificationId);
    } catch {
      // notification stays dismissed locally even if the delete failed
    }
  };

  return (
    <div className="safe-top">
      <header className="flex items-center justify-between px-4 py-4">
        <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
      </header>

      <div className="mb-1 flex gap-2 px-4">
        {([
          ["all", "All"],
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

      {tab === "all" &&
        (notifications === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="font-display text-sm font-semibold text-ink">Nothing yet</p>
            <p className="max-w-[240px] text-[12.5px] text-mist">
              Likes, comments, follows and gifts will show up here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col px-3 py-2">
            {(() => {
              const cutoff = Date.now() - 24 * 60 * 60 * 1000;
              const fresh = notifications.filter((n) => new Date(n.created_at).getTime() >= cutoff);
              const earlier = notifications.filter((n) => new Date(n.created_at).getTime() < cutoff);
              return (
                <>
                  {fresh.length > 0 && (
                    <NotificationGroup
                      label="New"
                      items={fresh}
                      onOpen={navigate}
                      followingIds={followingIds}
                      onFollowBack={handleFollowBack}
                      onIgnore={handleIgnore}
                    />
                  )}
                  {earlier.length > 0 && (
                    <NotificationGroup
                      label="Earlier"
                      items={earlier}
                      onOpen={navigate}
                      followingIds={followingIds}
                      onFollowBack={handleFollowBack}
                      onIgnore={handleIgnore}
                    />
                  )}
                </>
              );
            })()}
          </div>
        ))}

      {tab === "comments" && (
        <div className="px-3 py-2">
          {comments === null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-mist" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <MessageSquare className="h-6 w-6 text-mist" />
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
          )}
        </div>
      )}

      {tab === "mentions" && (
        <div className="px-3 py-2">
          {mentions === null ? (
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
          )}
        </div>
      )}
    </div>
  );
}

function NotificationGroup({
  label,
  items,
  onOpen,
  followingIds,
  onFollowBack,
  onIgnore,
}: {
  label: string;
  items: NotificationRow[];
  onOpen: (path: string) => void;
  followingIds: Set<string>;
  onFollowBack: (actorId: string) => void;
  onIgnore: (notificationId: string) => void;
}) {
  return (
    <div className="mb-2">
      <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-mist">{label}</p>
      {items.map((n) => {
        const Icon = iconFor[n.type] ?? Heart;
        const isFollow = n.type === "follow" && !!n.actor;
        const followingBack = isFollow && followingIds.has(n.actor!.id);
        return (
          <div
            key={n.id}
            onClick={() => n.actor && onOpen(`/profile/${n.actor.id}`)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.03] ${
              !n.read ? "bg-violet-500/[0.06]" : ""
            }`}
          >
            <div className="relative shrink-0">
              <Avatar name={n.actor?.name ?? "VYRO"} avatarUrl={n.actor?.avatar_url} size={44} />
              <span
                className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface ${colorFor[n.type] ?? "text-mist"}`}
              >
                <Icon className="h-3 w-3" />
              </span>
            </div>
            <p className="flex-1 text-[13px] leading-snug text-ink/90">
              <span className="font-semibold text-ink">{n.actor?.name ?? "Someone"} </span>
              {textFor[n.type] ?? "sent you a notification"}
            </p>
            {isFollow ? (
              <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onFollowBack(n.actor!.id)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                    followingBack ? "chip text-ink" : "grad-purple-blue text-white"
                  }`}
                >
                  {followingBack ? "Following" : "Follow Back"}
                </button>
                <button
                  onClick={() => onIgnore(n.id)}
                  className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-ink"
                  aria-label="Ignore"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[11px] text-mist">{timeAgo(n.created_at)}</span>
                {!n.read && <span className="h-2 w-2 rounded-full bg-cyan-400" />}
              </div>
            )}
          </div>
        );
      })}
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
