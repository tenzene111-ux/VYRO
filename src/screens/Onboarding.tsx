import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Globe2, Lock } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { users } from "../data/mock";

const interests = [
  "Travel", "Music", "Gaming", "Photography", "Sports", "Art & Design",
  "Food", "Fitness", "Technology", "Fashion", "Movies", "Nature",
];

const steps = ["interests", "creators", "privacy"] as const;

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
    set(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  const finish = () => navigate("/home");

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-vyro-radial px-6 pb-8 safe-top">
      <div className="my-6 flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "grad-primary" : "bg-white/10"}`} />
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="font-display text-xl font-bold text-ink">What are you into?</h2>
          <p className="mt-1 text-[13px] text-mist">Pick a few interests to personalize your feed.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {interests.map((i) => {
              const active = picked.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggle(picked, setPicked, i)}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    active ? "grad-purple-blue text-white" : "chip text-ink/85"
                  }`}
                >
                  {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
                  {i}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Follow creators & friends</h2>
          <p className="mt-1 text-[13px] text-mist">Build your circle from the start.</p>
          <div className="mt-5 flex flex-col gap-2.5">
            {users.slice(1, 7).map((u) => {
              const active = followed.includes(u.id);
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl glass-card p-3">
                  <Avatar name={u.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                    <p className="text-[11px] text-mist">@{u.username}</p>
                  </div>
                  <button
                    onClick={() => toggle(followed, setFollowed, u.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      active ? "chip text-ink" : "grad-purple-blue text-white"
                    }`}
                  >
                    {active ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Set your privacy</h2>
          <p className="mt-1 text-[13px] text-mist">You can always change this later in settings.</p>
          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={() => setVisibility("public")}
              className={`flex items-center gap-3 rounded-2xl p-4 text-left transition-colors ${
                visibility === "public" ? "glass-card glow-violet" : "chip"
              }`}
            >
              <Globe2 className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-sm font-semibold text-ink">Public profile</p>
                <p className="text-[12px] text-mist">Anyone on VYRO can see your posts and profile.</p>
              </div>
            </button>
            <button
              onClick={() => setVisibility("private")}
              className={`flex items-center gap-3 rounded-2xl p-4 text-left transition-colors ${
                visibility === "private" ? "glass-card glow-violet" : "chip"
              }`}
            >
              <Lock className="h-5 w-5 text-violet-300" />
              <div>
                <p className="text-sm font-semibold text-ink">Private profile</p>
                <p className="text-[12px] text-mist">Only approved friends can see your world.</p>
              </div>
            </button>
            <div className="flex items-center gap-3 rounded-2xl chip p-4">
              <Eye className="h-5 w-5 text-mist" />
              <p className="flex-1 text-[12.5px] text-ink/85">Show my online status and read receipts</p>
              <EyeOff className="h-4 w-4 text-mist" />
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-3 pt-8">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 rounded-full chip py-3.5 text-sm font-semibold text-ink">
            Back
          </button>
        )}
        <button
          onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
          className="flex-[2] rounded-full grad-primary py-3.5 text-sm font-bold text-white glow-violet active:scale-[0.98] transition-transform"
        >
          {step < steps.length - 1 ? "Continue" : "Enter VYRO"}
        </button>
      </div>
      {step < steps.length - 1 && (
        <button onClick={finish} className="mt-3 text-center text-[12.5px] text-mist">
          Skip for now
        </button>
      )}
    </div>
  );
}
