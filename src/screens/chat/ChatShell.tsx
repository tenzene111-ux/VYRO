import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { MessageSquare, Phone, Users2, Users, Settings, ArrowLeft } from "lucide-react";
import { Logo } from "../../components/Logo";

const tabs = [
  { to: "/chat", label: "Chats", icon: MessageSquare, end: true },
  { to: "/chat/calls", label: "Calls", icon: Phone, end: false },
  { to: "/chat/people", label: "People", icon: Users2, end: false },
  { to: "/chat/groups", label: "Groups", icon: Users, end: false },
  { to: "/chat/settings", label: "Settings", icon: Settings, end: false },
];

export function ChatShell() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial">
      <header className="flex items-center justify-between px-4 pb-2 pt-4 safe-top">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/home")} className="rounded-full p-1.5 text-mist hover:text-ink lg:hidden">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <Logo size={19} withMark />
          <span className="font-display text-[15px] font-semibold text-ink">Chat</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <Outlet />
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
