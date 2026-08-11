import { paletteFor } from "../lib/gradients";
import clsx from "clsx";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function Avatar({
  name,
  avatarUrl,
  size = 44,
  online,
  ring,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  online?: boolean;
  ring?: "story" | "story-seen" | "live" | boolean;
  className?: string;
}) {
  const [from, to] = paletteFor(name);
  const ringPad = ring ? Math.max(3, Math.round(size * 0.07)) : 0;
  const outer = size + ringPad * 2;

  const ringBg =
    ring === "story-seen"
      ? "rgba(255,255,255,0.16)"
      : ring === "live"
      ? "linear-gradient(135deg, #ef4444, #d946ef)"
      : ring
      ? "conic-gradient(from 140deg, #22d3ee, #8b5cf6, #d946ef, #22d3ee)"
      : "transparent";

  return (
    <div
      className={clsx("relative inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: outer, height: outer, background: ring ? ringBg : "transparent" }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="rounded-full object-cover"
          style={{
            width: size,
            height: size,
            border: ring ? "2.5px solid #050510" : "1px solid rgba(255,255,255,0.12)",
          }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full font-display font-semibold text-white"
          style={{
            width: size,
            height: size,
            background: `linear-gradient(135deg, ${from}, ${to})`,
            fontSize: size * 0.36,
            border: ring ? "2.5px solid #050510" : "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {initials(name)}
        </div>
      )}
      {online && (
        <span
          className="absolute rounded-full border-2 border-void bg-emerald-400"
          style={{
            width: size * 0.26,
            height: size * 0.26,
            right: ringPad + size * 0.02,
            bottom: ringPad + size * 0.02,
            borderColor: "#050510",
          }}
        />
      )}
    </div>
  );
}
