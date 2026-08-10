import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-svh flex-col bg-vyro-radial px-5 safe-top">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist hover:text-ink">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <p className="font-display text-base font-semibold text-ink">{title}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-24 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl glass-card glow-violet">
          <span className="absolute inset-0 rounded-3xl grad-primary opacity-20 blur-xl animate-glow-pulse" />
          <Sparkles className="relative h-9 w-9 text-violet-300" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-ink">{title} is warming up</p>
          <p className="mx-auto mt-1.5 max-w-[280px] text-sm text-mist">
            {description ?? "This module is part of the VYRO universe and is coming soon."}
          </p>
        </div>
      </div>
    </div>
  );
}
