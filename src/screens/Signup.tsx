import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, AtSign, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Logo, LogoMark } from "../components/Logo";
import { useAuth } from "../context/AuthContext";

export function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  const validateStep0 = () => {
    if (!name.trim() || !username.trim()) return "Enter your name and a username.";
    if (!/^[a-z0-9_]{3,20}$/i.test(username.trim())) return "Username: 3-20 letters, numbers or underscores.";
    return null;
  };

  const handleNext = () => {
    setError(null);
    const err = validateStep0();
    if (err) {
      setError(err);
      return;
    }
    setStep(1);
  };

  const handleCreate = async () => {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error, session } = await signUp(email.trim(), password, {
      name: name.trim(),
      username: username.trim().toLowerCase(),
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    if (session) {
      navigate("/onboarding");
    } else {
      setConfirmEmailSent(true);
    }
  };

  if (confirmEmailSent) {
    return (
      <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col items-center justify-center gap-4 bg-vyro-radial px-8 text-center safe-top">
        <div className="flex h-16 w-16 items-center justify-center rounded-full glass-card glow-violet">
          <CheckCircle2 className="h-8 w-8 text-cyan-300" />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">Check your email</h2>
        <p className="text-[13px] text-mist">
          We sent a confirmation link to <span className="text-ink">{email}</span>. Confirm it, then come back and log
          in.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 rounded-full grad-primary px-6 py-3 text-sm font-bold text-white glow-violet"
        >
          Go to Log In
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-vyro-radial px-6 safe-top">
      <div className="flex flex-col items-center pb-6 pt-8">
        <LogoMark size={44} />
        <Logo size={18} />
      </div>

      <div className="mb-6 flex gap-1.5">
        {[0, 1].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "grad-primary" : "bg-white/10"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="mb-1 font-display text-lg font-bold text-ink">Create your identity</h2>
          <Field icon={User} placeholder="Full name" value={name} onChange={setName} />
          <Field icon={AtSign} placeholder="Choose a username" value={username} onChange={setUsername} />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="mb-1 font-display text-lg font-bold text-ink">Secure your account</h2>
          <Field icon={Mail} placeholder="Email address" value={email} onChange={setEmail} type="email" />
          <Field icon={Lock} placeholder="Create a password (min 6 chars)" value={password} onChange={setPassword} type="password" />
        </div>
      )}

      {error && <p className="mt-3 text-[12.5px] text-rose-400">{error}</p>}

      <button
        onClick={step === 0 ? handleNext : handleCreate}
        disabled={busy}
        className="mt-8 flex items-center justify-center gap-2 rounded-full grad-primary py-3.5 text-sm font-bold text-white glow-violet transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {step === 0 ? "Continue" : "Create Account"}
      </button>

      <p className="mb-8 mt-6 text-center text-[13px] text-mist">
        Already have an account?{" "}
        <button onClick={() => navigate("/login")} className="font-semibold text-cyan-300">
          Log in
        </button>
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  icon: typeof User;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 rounded-2xl chip px-4 py-3.5">
      <Icon className="h-4.5 w-4.5 shrink-0 text-mist" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
      />
    </label>
  );
}
