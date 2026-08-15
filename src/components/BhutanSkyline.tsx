export function BhutanSkyline() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ backgroundColor: "#050510" }}>
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice" className="h-full w-full opacity-80">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050510" />
            <stop offset="50%" stopColor="#0d0a20" />
            <stop offset="100%" stopColor="#161030" />
          </linearGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ridgeFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c1638" />
            <stop offset="100%" stopColor="#100c24" />
          </linearGradient>
          <linearGradient id="ridgeNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c0918" />
            <stop offset="100%" stopColor="#050510" />
          </linearGradient>
        </defs>

        <rect width="400" height="400" fill="url(#sky)" />
        <circle cx="310" cy="70" r="55" fill="url(#moonGlow)" />
        <circle cx="310" cy="70" r="12" fill="#f5f3ff" opacity="0.85" />

        {[
          [40, 40], [95, 90], [150, 30], [430, 60], [110, 120], [80, 20], [200, 140], [250, 50],
          [340, 130], [20, 110], [370, 40], [400, 100], [60, 160], [180, 100],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.2" fill="#fff" opacity={0.2 + (i % 3) * 0.12} />
        ))}

        <path
          d="M0,300 L30,265 L55,285 L85,240 L120,280 L150,255 L180,290 L215,260 L250,295 L285,250 L320,285 L355,260 L400,290 L400,400 L0,400 Z"
          fill="url(#ridgeFar)"
        />

        <path
          d="M0,335 L40,300 L70,325 L110,280 L150,320 L190,290 L230,330 L270,295 L310,325 L350,300 L400,330 L400,400 L0,400 Z"
          fill="url(#ridgeNear)"
        />
        <g transform="translate(150,278)">
          <rect x="0" y="45" width="70" height="30" fill="#0a0716" />
          <rect x="8" y="28" width="54" height="20" fill="#0d0a1c" />
          <rect x="18" y="10" width="34" height="20" fill="#100c22" />
          <polygon points="18,10 35,-4 52,10" fill="#130f28" />
          {[[14, 56], [30, 56], [46, 56], [14, 36], [46, 36], [26, 18]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="6" height="8" fill="#f5c451" opacity={0.35 + (i % 2) * 0.15} />
          ))}
        </g>
      </svg>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(5,5,16,0.25), rgba(5,5,16,0.55) 55%, #050510 88%)" }}
      />
    </div>
  );
}
