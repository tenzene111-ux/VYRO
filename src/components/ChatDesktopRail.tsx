import { NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { MessageSquare, Phone, Users2, Users, Settings, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { useIsDesktop } from "../lib/useIsDesktop";
import { ChatList } from "../screens/chat/ChatList";
import { CallsTab } from "../screens/chat/CallsTab";
import { PeopleTab } from "../screens/chat/PeopleTab";
import { GroupsTab } from "../screens/chat/GroupsTab";
import { ChatSettingsTab } from "../screens/chat/ChatSettingsTab";

const tabs = [
  { to: "/chat", label: "Chats", icon: MessageSquare, end: true },
  { to: "/chat/calls", label: "Calls", icon: Phone, end: false },
  { to: "/chat/people", label: "People", icon: Users2, end: false },
  { to: "/chat/groups", label: "Groups", icon: Users, end: false },
  { to: "/chat/settings", label: "Settings", icon: Settings, end: false },
];

const RESERVED_SEGMENTS = new Set(["calls", "people", "groups", "settings", "archived", "folders", "qr"]);

// Everything else under /chat (group info, channel view, archived, folders,
// QR) stays a mobile-style full-screen overlay on desktop too — this rail is
// scoped to the core list + conversation + group messaging screens.
function chatRailMode(pathname: string): "list" | "conversation" | "group" | null {
  if (pathname === "/chat") return "list";
  if (/^\/chat\/(calls|people|groups|settings)$/.test(pathname)) return "list";
  if (/^\/chat\/group\/[^/]+$/.test(pathname)) return "group";
  const m = pathname.match(/^\/chat\/([^/]+)$/);
  if (m && !RESERVED_SEGMENTS.has(m[1])) return "conversation";
  return null;
}

export function ChatDesktopRail() {
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const mode = chatRailMode(location.pathname);

  if (!isDesktop || !mode) return null;

  // browsing a conversation keeps the rail on the "Chats" list, same as
  // Telegram Desktop — only the 5 tab routes themselves change rail content
  const railPath = mode === "list" ? location.pathname : "/chat";

  return (
    <div className="fixed inset-y-0 left-0 z-40 flex w-[360px] flex-col border-r border-white/5 bg-vyro-radial">
      <header className="flex items-center justify-between px-4 pb-2 pt-4 safe-top">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/home")} className="rounded-full p-1.5 text-mist hover:text-ink">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <Logo size={19} withMark />
          <span className="font-display text-[15px] font-semibold text-ink">Chat</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {railPath === "/chat/calls" ? (
          <CallsTab />
        ) : railPath === "/chat/people" ? (
          <PeopleTab />
        ) : railPath === "/chat/groups" ? (
          <GroupsTab />
        ) : railPath === "/chat/settings" ? (
          <ChatSettingsTab />
        ) : (
          <ChatList />
        )}
      </div>

      <nav className="flex items-center justify-between border-t border-white/6 px-2 py-2 glass-strong safe-bottom">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-medium transition-colors",
                isActive ? "text-cyan-300" : "text-mist"
              )
            }
          >
            {({ isActive }) => (
              <>
                <t.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
