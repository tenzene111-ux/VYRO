import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, AtSign, Calendar, Mail, Lock, Camera } from "lucide-react";
import { Logo, LogoMark } from "../components/Logo";

export function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-vyro-radial px-6 safe-top">
      <div className="flex flex-col items-center pb-6 pt-8">
        <LogoMark size={44} />
        <Logo size={18} />
      </div>

      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "grad-primary" : "bg-white/10"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="mb-1 font-display text-lg font-bold text-ink">Create your identity</h2>
          <Field icon={User} placeholder="Full name" />
          <Field icon={AtSign} placeholder="Choose a username" />
          <Field icon={Calendar} placeholder="Date of birth" type="date" />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="mb-1 font-display text-lg font-bold text-ink">Secure your account</h2>
          <Field icon={Mail} placeholder="Email or phone number" />
          <Field icon={Lock} placeholder="Create a password" type="password" />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <button className="relative flex h-28 w-28 items-center justify-center rounded-full glass-card">
            <Camera className="h-8 w-8 text-mist" />
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full grad-primary text-white">
              +
            </span>
          </button>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Add a profile photo</h2>
            <p className="mt-1 text-[13px] text-mist">Help people recognize you across VYRO.</p>
          </div>
        </div>
      )}

      <button
        onClick={() => (step < 2 ? setStep(step + 1) : navigate("/onboarding"))}
        className="mt-8 rounded-full grad-primary py-3.5 text-sm font-bold text-white glow-violet active:scale-[0.98] transition-transform"
      >
        {step < 2 ? "Continue" : "Create Account"}
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

function Field({ icon: Icon, placeholder, type = "text" }: { icon: typeof User; placeholder: string; type?: string }) {
  return (
    <label className="flex items-center gap-2.5 rounded-2xl chip px-4 py-3.5">
      <Icon className="h-4.5 w-4.5 shrink-0 text-mist" />
      <input
        type={type}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
      />
    </label>
  );
}
