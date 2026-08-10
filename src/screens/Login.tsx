import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Mail, AtSign, Eye, EyeOff, Fingerprint } from "lucide-react";
import { Logo, LogoMark } from "../components/Logo";

const methods = [
  { id: "phone", label: "Phone", icon: Phone },
  { id: "email", label: "Email", icon: Mail },
  { id: "username", label: "Username", icon: AtSign },
];

export function Login() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("phone");
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-vyro-radial px-6 safe-top">
      <div className="flex flex-col items-center pb-6 pt-10">
        <LogoMark size={52} />
        <Logo size={20} />
        <p className="mt-1.5 text-[12.5px] text-mist">Your World. Your People. Your Voice.</p>
      </div>

      <div className="mb-5 flex gap-2 rounded-2xl chip p-1">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
              method === m.id ? "grad-purple-blue text-white" : "text-mist"
            }`}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2.5 rounded-2xl chip px-4 py-3.5">
          <ActiveMethodIcon method={method} />
          <input
            placeholder={method === "phone" ? "+975 17 123 456" : method === "email" ? "you@example.com" : "@username"}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2.5 rounded-2xl chip px-4 py-3.5">
          <Fingerprint className="h-4.5 w-4.5 text-mist" />
          <input
            type={showPw ? "text" : "password"}
            placeholder="Password"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
          <button onClick={() => setShowPw((s) => !s)} type="button">
            {showPw ? <EyeOff className="h-4.5 w-4.5 text-mist" /> : <Eye className="h-4.5 w-4.5 text-mist" />}
          </button>
        </label>
      </div>

      <button className="mt-2 self-end text-xs font-medium text-violet-300">Forgot password?</button>

      <button
        onClick={() => navigate("/onboarding")}
        className="mt-6 rounded-full grad-primary py-3.5 text-sm font-bold text-white glow-violet active:scale-[0.98] transition-transform"
      >
        Log In
      </button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-[11px] text-mist">or continue with</span>
        <div className="h-px flex-1 bg-white/8" />
      </div>

      <div className="flex gap-3">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl chip py-3 text-sm font-semibold text-ink">
          Google
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl chip py-3 text-sm font-semibold text-ink">
          Apple
        </button>
      </div>

      <p className="mt-8 pb-8 text-center text-[13px] text-mist">
        New to VYRO?{" "}
        <button onClick={() => navigate("/signup")} className="font-semibold text-cyan-300">
          Create account
        </button>
      </p>
    </div>
  );
}

function ActiveMethodIcon({ method }: { method: string }) {
  const Icon = methods.find((m) => m.id === method)?.icon ?? Phone;
  return <Icon className="h-4.5 w-4.5 text-mist" />;
}
