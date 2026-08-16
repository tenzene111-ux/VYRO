import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export function AccountDetails() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setError(null);
    setNotice(null);
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice("Password updated.");
    setNewPassword("");
  };

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Account details</h1>
      </header>

      <div className="mb-5 overflow-hidden rounded-2xl glass-card">
        <Row label="Name" value={profile?.name ?? "—"} />
        <Row label="Username" value={`@${profile?.username ?? ""}`} />
        <Row label="Email" value={user?.email ?? "—"} />
      </div>

      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-mist">Change password</p>
      <div className="mb-4 overflow-hidden rounded-2xl glass-card p-3.5">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="w-full rounded-xl chip px-3.5 py-2.5 text-sm text-ink placeholder:text-mist focus:outline-none"
        />
        <button
          onClick={handleChangePassword}
          disabled={busy || !newPassword}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full grad-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
        {error && <p className="mt-2 text-[12px] text-rose-400">{error}</p>}
        {notice && <p className="mt-2 text-[12px] text-cyan-300">{notice}</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-3.5 py-3 last:border-b-0">
      <span className="text-[13px] text-mist">{label}</span>
      <span className="text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}
