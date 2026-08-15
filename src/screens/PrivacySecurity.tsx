import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Fingerprint, Plus, Trash2, Loader2, ShieldCheck, Laptop, Smartphone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isPasskeySupported, listMyPasskeys, registerPasskey, deletePasskey, type Passkey } from "../lib/passkey";
import { isPushSupported, getExistingSubscription, enablePush, disablePush } from "../lib/push";

export function PrivacySecurity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listMyPasskeys(user.id).then(setPasskeys).catch(() => setPasskeys([]));
  }, [user]);

  useEffect(() => {
    getExistingSubscription().then((sub) => setPushOn(!!sub));
  }, []);

  const handleTogglePush = async () => {
    if (!user || pushBusy) return;
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
      } else {
        const result = await enablePush(user.id);
        if (result.ok) setPushOn(true);
        else setPushError(result.error ?? "Couldn't enable notifications.");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleAdd = async () => {
    if (!user || adding) return;
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const name = window.prompt("Name this passkey (e.g. \"My iPhone\")", "Passkey") ?? "Passkey";
      await registerPasskey(name);
      setNotice("Passkey added.");
      listMyPasskeys(user.id).then(setPasskeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add a passkey.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deletePasskey(id);
    setPasskeys((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
  };

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Privacy &amp; Security</h1>
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-2xl glass-card p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <div>
          <p className="text-[13px] font-semibold text-ink">End-to-end encrypted DMs</p>
          <p className="text-[12px] text-mist">Your direct messages are encrypted on your device. Manage them from any chat.</p>
        </div>
      </div>

      {isPushSupported() && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl glass-card p-4">
          {pushOn ? (
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          ) : (
            <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-mist" />
          )}
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-ink">Push notifications</p>
            <p className="text-[12px] text-mist">Get notified about likes, comments, follows and gifts.</p>
            {pushError && <p className="mt-1 text-[12px] text-rose-400">{pushError}</p>}
          </div>
          <button
            onClick={handleTogglePush}
            disabled={pushBusy}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold disabled:opacity-50 ${
              pushOn ? "grad-primary text-white" : "chip text-mist"
            }`}
          >
            {pushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pushOn ? "On" : "Off"}
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-ink">Passkeys</p>
        {isPasskeySupported() && (
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1.5 rounded-full grad-primary px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Passkey
          </button>
        )}
      </div>
      <p className="mb-4 text-[12px] text-mist">
        Sign in with your fingerprint, face, or device PIN instead of a password. Your private key never leaves this device.
      </p>

      {!isPasskeySupported() && (
        <p className="mb-4 rounded-2xl glass-card p-4 text-[12.5px] text-mist">
          Passkeys aren't supported in this browser. Try a recent version of Chrome, Safari, or Edge.
        </p>
      )}

      {error && <p className="mb-3 text-[12.5px] text-rose-400">{error}</p>}
      {notice && <p className="mb-3 text-[12.5px] text-emerald-300">{notice}</p>}

      {passkeys === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : passkeys.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Fingerprint className="h-7 w-7 text-mist" />
          <p className="text-[12.5px] text-mist">No passkeys yet. Add one for faster, passwordless sign-in.</p>
        </div>
      ) : (
        <div className="space-y-2 pb-8">
          {passkeys.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl glass-card p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-purple-blue">
                {p.device_type === "multiDevice" ? <Smartphone className="h-4.5 w-4.5 text-white" /> : <Laptop className="h-4.5 w-4.5 text-white" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{p.name || "Passkey"}</p>
                <p className="text-[11px] text-mist">
                  Added {new Date(p.created_at).toLocaleDateString()}
                  {p.last_used_at && ` · Last used ${new Date(p.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <button onClick={() => handleDelete(p.id)} className="shrink-0 rounded-full chip p-2 text-rose-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
