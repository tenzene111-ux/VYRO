export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#0a0a18" stroke="rgba(255,255,255,0.06)" />
      <path
        d="M14 16 L32 46 L50 16"
        fill="none"
        stroke="url(#logo-grad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 22, withMark = false }: { size?: number; withMark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {withMark && <LogoMark size={size + 6} />}
      <span
        className="font-display font-bold tracking-wide text-gradient"
        style={{ fontSize: size }}
      >
        VYRO
      </span>
    </span>
  );
}
