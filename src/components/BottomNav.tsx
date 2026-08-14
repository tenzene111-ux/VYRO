import { NavLink } from "react-router-dom";
import { Home, Search, Bell, User, Plus } from "lucide-react";
import clsx from "clsx";
import { useUI } from "../context/UIContext";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Search },
];
const itemsRight = [
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const { setCreateOpen } = useUI();

  return (
    <nav className="sticky inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-white/8 bg-surface px-2 py-2 safe-bottom">
      {items.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}

      <button
        onClick={() => setCreateOpen(true)}
        className="relative -mt-8 flex h-14 w-14 shrink-0 items-center justify-center rounded-full grad-primary glow-violet animate-float active:scale-95 transition-transform"
        aria-label="Create"
      >
        <span className="absolute inset-0 rounded-full grad-primary blur-md opacity-60 animate-glow-pulse" />
        <Plus className="relative h-6 w-6 text-white" strokeWidth={2.5} />
      </button>

      {itemsRight.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}
    </nav>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-medium transition-colors",
          isActive ? "text-cyan-300" : "text-mist hover:text-ink"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
