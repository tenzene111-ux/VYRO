import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Factor = { id: string; friendly_name?: string; status: string };

export function TwoFactorAuth() {
  const navigate = useNavigate();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactors(data?.totp.filter((f) => f.status === "verified") ?? []);
    });
  };

  useEffect(load, []);

  const handleStartEnroll = async () => {
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPendingFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  };

  const handleVerify = async () => {
    if (!pendingFactorId || code.trim().length !== 6) return;
    setError(null);
    setBusy(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId });
    if (challengeError || !challenge) {
      setBusy(false);
      setError(challengeError?.message ?? "Couldn't start verification.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setPendingFactorId(null);
    setCode("");
    load();
  };

  const handleCancelEnroll = async () => {
    if (pendingFactorId) await supabase.auth.mfa.unenroll({ factorId: pendingFactorId }).catch(() => {});
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setPendingFactorId(null);
    setCode("");
  };

  const handleDisable = async (factorId: string) => {
    if (!window.confirm("Turn off two-factor authentication?")) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
    setBusy(false);
    load();
  };

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Two-factor authentication</h1>
      </header>

      {factors === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : enrolling ? (
        <div className="overflow-hidden rounded-2xl glass-card p-4">
          <p className="mb-3 text-[13px] text-ink/90">Scan this QR code with an authenticator app (Google Authenticator, Authy, etc.):</p>
          {qrCode && (
            <div
              className="mx-auto mb-3 w-full max-w-[220px] overflow-hidden rounded-2xl bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
          )}
          {secret && (
            <p className="mb-4 break-all rounded-xl chip px-3 py-2 text-center text-[11px] text-mist">{secret}</p>
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            className="w-full rounded-xl chip px-3.5 py-2.5 text-center text-lg tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:text-mist focus:outline-none"
          />
          {error && <p className="mt-2 text-[12px] text-rose-400">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={handleCancelEnroll} className="flex-1 rounded-full chip py-2.5 text-sm font-semibold text-ink">
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={busy || code.length !== 6}
              className="flex flex-1 items-center justify-center gap-2 rounded-full grad-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify & enable
            </button>
          </div>
        </div>
      ) : factors.length > 0 ? (
        <div className="overflow-hidden rounded-2xl glass-card p-4">
          <div className="mb-3 flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-semibold">Two-factor authentication is on</p>
          </div>
          <p className="mb-4 text-[12.5px] text-mist">Your account requires a code from your authenticator app when signing in.</p>
          <button
            onClick={() => handleDisable(factors[0].id)}
            disabled={busy}
            className="w-full rounded-full chip py-2.5 text-sm font-semibold text-rose-400 disabled:opacity-50"
          >
            Turn off
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl glass-card p-4">
          <p className="mb-4 text-[13px] text-ink/90">
            Add an extra layer of security. Once enabled, you'll need a code from an authenticator app to log in.
          </p>
          {error && <p className="mb-3 text-[12px] text-rose-400">{error}</p>}
          <button
            onClick={handleStartEnroll}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full grad-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enable two-factor authentication
          </button>
        </div>
      )}
    </div>
  );
}
