import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Bell, Shield, Database, HelpCircle, ChevronRight, Moon, Sun, Monitor, Wallet, Sparkles,
  LogOut, EyeOff, Fingerprint, Users2, Gift, ShieldCheck, Languages, FileText, BookOpen, Info,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { InfoSheet } from "../../components/InfoSheet";
import { useAuth } from "../../context/AuthContext";
import { getStoredTheme, setTheme, type ThemeMode } from "../../lib/theme";

const infoContent = {
  terms: {
    title: "Terms & Conditions",
    body: "By using VYRO you agree to treat other members with respect, own the rights to what you post, and follow local law. VYRO Coins are a virtual item with no cash-out value outside features explicitly built for that. We can remove content or suspend accounts that violate our Community Guidelines.",
  },
  guidelines: {
    title: "Community Guidelines",
    body: "VYRO is built for Bhutan's creators and their communities. Be kind. No harassment, hate speech, nudity, scams, or dangerous content. Give credit for sounds and remixes. Report anything that breaks these rules using the Report option on any post, video, or profile.",
  },
  about: {
    title: "About VYRO",
    body: "VYRO — Create • Share • Earn. The Next Gen Bhutanese Social & Video App. Built for short videos, posts, live streaming, and a creator economy rooted in Bhutanese culture, from Thimphu to the world.",
  },
};

export function ChatSettingsTab() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme());
  const [readReceipts, setReadReceipts] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [language, setLanguage] = useState<"en" | "dz">(
    (localStorage.getItem("vyro_language") as "en" | "dz") ?? "en"
  );
  const [openSheet, setOpenSheet] = useState<keyof typeof infoContent | null>(null);

  const handleLanguageChange = (lang: "en" | "dz") => {
    setLanguage(lang);
    localStorage.setItem("vyro_language", lang);
  };

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
        <LanguageRow value={language} onChange={handleLanguageChange} />
      </SettingsGroup>

      <SettingsGroup title="Privacy & Security">
        <Row icon={Lock} label="Privacy Center" onClick={() => navigate("/privacy")} />
        <ToggleRow icon={EyeOff} label="Read receipts" value={readReceipts} onChange={setReadReceipts} />
        <ToggleRow icon={Fingerprint} label="Biometric lock" value={biometric} onChange={setBiometric} />
        <Row icon={Shield} label="Two-factor authentication" onClick={() => {}} />
      </SettingsGroup>

      {profile?.is_admin && (
        <SettingsGroup title="Admin">
          <Row icon={ShieldCheck} label="Admin Dashboard" onClick={() => navigate("/admin")} />
        </SettingsGroup>
      )}

      <SettingsGroup title="Support">
        <Row icon={Database} label="Data & storage" onClick={() => {}} />
        <Row icon={HelpCircle} label="Help center" onClick={() => {}} />
      </SettingsGroup>

      <SettingsGroup title="More">
        <Row icon={FileText} label="Terms & Conditions" onClick={() => setOpenSheet("terms")} />
        <Row icon={BookOpen} label="Community Guidelines" onClick={() => setOpenSheet("guidelines")} />
        <Row icon={Info} label="About VYRO" onClick={() => setOpenSheet("about")} />
      </SettingsGroup>

      <button
        onClick={handleLogout}
        className="mb-8 mt-2 flex w-full items-center justify-center gap-2 rounded-2xl chip py-3 text-sm font-semibold text-rose-400"
      >
        <LogOut className="h-4.5 w-4.5" /> Log Out
      </button>

      {openSheet && (
        <InfoSheet title={infoContent[openSheet].title} body={infoContent[openSheet].body} onClose={() => setOpenSheet(null)} />
      )}
    </div>
  );
}

function LanguageRow({ value, onChange }: { value: "en" | "dz"; onChange: (v: "en" | "dz") => void }) {
  return (
    <div className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-b-0">
      <Languages className="h-4.5 w-4.5 text-violet-300" />
      <span className="flex-1 text-[13.5px] text-ink">Language</span>
      <div className="flex gap-1 rounded-full chip p-0.5">
        {(["en", "dz"] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => onChange(lang)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              value === lang ? "grad-purple-blue text-white" : "text-mist"
            }`}
          >
            {lang === "en" ? "English" : "Dzongkha"}
          </button>
        ))}
      </div>
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
