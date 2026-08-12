import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { Logo, LogoMark } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { isPasskeySupported, loginWithPasskey } from "../lib/passkey";

export function Login() {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const handlePasskeyLogin = async () => {
    setError(null);
    setNotice(null);
    setPasskeyBusy(true);
    try {
      await loginWithPasskey();
      navigate("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in with a passkey.");
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { error } = await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    navigate("/home");
  };

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email above first, then tap \"Forgot password?\"");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice("Password reset email sent — check your inbox.");
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-vyro-radial px-6 safe-top">
      <div className="flex flex-col items-center pb-8 pt-10">
        <LogoMark size={52} />
        <Logo size={20} />
        <p className="mt-1.5 text-[12.5px] text-mist">Your World. Your People. Your Voice.</p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2.5 rounded-2xl chip px-4 py-3.5">
          <Mail className="h-4.5 w-4.5 shrink-0 text-mist" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2.5 rounded-2xl chip px-4 py-3.5">
          <Fingerprint className="h-4.5 w-4.5 shrink-0 text-mist" />
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
          <button onClick={() => setShowPw((s) => !s)} type="button">
            {showPw ? <EyeOff className="h-4.5 w-4.5 text-mist" /> : <Eye className="h-4.5 w-4.5 text-mist" />}
          </button>
        </label>
      </div>

      {error && <p className="mt-3 text-[12.5px] text-rose-400">{error}</p>}
      {notice && <p className="mt-3 text-[12.5px] text-cyan-300">{notice}</p>}

      <button onClick={handleForgotPassword} className="mt-2 self-end text-xs font-medium text-violet-300">
        Forgot password?
      </button>

      <button
        onClick={handleLogin}
        disabled={busy}
        className="mt-6 flex items-center justify-center gap-2 rounded-full grad-primary py-3.5 text-sm font-bold text-white glow-violet transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Log In
      </button>

      {isPasskeySupported() && (
        <>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] text-mist">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <button
            onClick={handlePasskeyLogin}
            disabled={passkeyBusy}
            className="mt-4 flex items-center justify-center gap-2 rounded-full chip py-3.5 text-sm font-semibold text-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {passkeyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4.5 w-4.5" />}
            Sign in with Passkey
          </button>
        </>
      )}

      <p className="mt-8 pb-8 text-center text-[13px] text-mist">
        New to VYRO?{" "}
        <button onClick={() => navigate("/signup")} className="font-semibold text-cyan-300">
          Create account
        </button>
      </p>
    </div>
  );
}
