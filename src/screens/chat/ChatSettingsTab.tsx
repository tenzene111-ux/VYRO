import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Bell, Shield, Database, HelpCircle, ChevronRight, Moon, Sun, Monitor, Wallet, Sparkles,
  LogOut, EyeOff, Fingerprint, Users2, Gift,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { getStoredTheme, setTheme, type ThemeMode } from "../../lib/theme";

export function ChatSettingsTab() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme());
  const [readReceipts, setReadReceipts] = useState(true);
  const [biometric, setBiometric] = useState(true);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeState(mode);
    setTheme(mode);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="px-4">
      <button
        onClick={() => navigate("/profile")}
        className="mb-5 flex w-full items-center gap-3 rounded-2xl glass-card p-3.5 text-left"
      >
        <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{profile?.name ?? "Loading…"}</p>
          <p className="text-[11px] text-mist">@{profile?.username ?? ""}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-mist" />
      </button>

      <SettingsGroup title="Account">
        <Row icon={User} label="Account details" onClick={() => {}} />
        <Row icon={Wallet} label="VYRO Wallet" onClick={() => navigate("/wallet")} />
        <Row icon={Sparkles} label="Creator Studio" onClick={() => navigate("/studio")} />
        <Row icon={Users2} label="Community" onClick={() => navigate("/community")} />
        <Row icon={Gift} label="Rewards" onClick={() => navigate("/rewards")} />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <ThemeRow value={theme} onChange={handleThemeChange} />
        <Row icon={Bell} label="Notifications" onClick={() => {}} />
      </SettingsGroup>

      <SettingsGroup title="Privacy & Security">
        <Row icon={Lock} label="Privacy Center" onClick={() => navigate("/privacy")} />
        <ToggleRow icon={EyeOff} label="Read receipts" value={readReceipts} onChange={setReadReceipts} />
        <ToggleRow icon={Fingerprint} label="Biometric lock" value={biometric} onChange={setBiometric} />
        <Row icon={Shield} label="Two-factor authentication" onClick={() => {}} />
      </SettingsGroup>

      <SettingsGroup title="Support">
        <Row icon={Database} label="Data & storage" onClick={() => {}} />
        <Row icon={HelpCircle} label="Help center" onClick={() => {}} />
      </SettingsGroup>

      <button
        onClick={handleLogout}
        className="mb-8 mt-2 flex w-full items-center justify-center gap-2 rounded-2xl chip py-3 text-sm font-semibold text-rose-400"
      >
        <LogOut className="h-4.5 w-4.5" /> Log Out
      </button>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-mist">{title}</h2>
      <div className="overflow-hidden rounded-2xl glass-card">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, onClick }: { icon: typeof User; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-3 text-left last:border-b-0">
      <Icon className="h-4.5 w-4.5 text-violet-300" />
      <span className="flex-1 text-[13.5px] text-ink">{label}</span>
      <ChevronRight className="h-4 w-4 text-mist" />
    </button>
  );
}

function ThemeRow({ value, onChange }: { value: ThemeMode; onChange: (mode: ThemeMode) => void }) {
  const options: { mode: ThemeMode; icon: typeof Moon; label: string }[] = [
    { mode: "dark", icon: Moon, label: "Dark" },
    { mode: "light", icon: Sun, label: "Light" },
    { mode: "system", icon: Monitor, label: "System" },
  ];
  return (
    <div className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-b-0">
      <Moon className="h-4.5 w-4.5 text-violet-300" />
      <span className="flex-1 text-[13.5px] text-ink">Appearance</span>
      <div className="flex gap-1 rounded-full chip p-0.5">
        {options.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => onChange(opt.mode)}
            title={opt.label}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              value === opt.mode ? "grad-purple-blue text-white" : "text-mist"
            }`}
          >
            <opt.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof User;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-b-0">
      <Icon className="h-4.5 w-4.5 text-violet-300" />
      <span className="flex-1 text-[13.5px] text-ink">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "grad-purple-blue" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
