import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, UserPlus, Gift, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { listNotifications, markAllNotificationsRead, subscribeToNotifications, type NotificationRow } from "../lib/api";

const iconFor: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  gift: Gift,
};

const colorFor: Record<string, string> = {
  like: "text-rose-400",
  comment: "text-cyan-400",
  follow: "text-blue-400",
  gift: "text-amber-300",
};

const textFor: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  gift: "sent you a gift 🎁",
};

export function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listNotifications(user.id).then(setNotifications);
    markAllNotificationsRead(user.id);
    const unsubscribe = subscribeToNotifications(user.id, () => {
      listNotifications(user.id).then(setNotifications);
    });
    return unsubscribe;
  }, [user]);

  return (
    <div className="safe-top">
      <header className="flex items-center justify-between px-4 py-4">
        <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
      </header>

      {notifications === null ? (
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
                {fresh.length > 0 && <NotificationGroup label="New" items={fresh} onOpen={navigate} />}
                {earlier.length > 0 && <NotificationGroup label="Earlier" items={earlier} onOpen={navigate} />}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function NotificationGroup({
  label,
  items,
  onOpen,
}: {
  label: string;
  items: NotificationRow[];
  onOpen: (path: string) => void;
}) {
  return (
    <div className="mb-2">
      <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-mist">{label}</p>
      {items.map((n) => {
        const Icon = iconFor[n.type] ?? Heart;
        return (
          <button
            key={n.id}
            onClick={() => n.actor && onOpen(`/profile/${n.actor.id}`)}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.03] ${
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
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] text-mist">{timeAgo(n.created_at)}</span>
              {!n.read && <span className="h-2 w-2 rounded-full bg-cyan-400" />}
            </div>
          </button>
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
