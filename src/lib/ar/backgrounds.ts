function parseLinearGradient(css: string): { angleDeg: number; stops: { color: string; pct: number }[] } | null {
  const m = css.match(/linear-gradient\(([^,]+),(.+)\)/);
  if (!m) return null;
  const angleDeg = parseFloat(m[1]);
  const stops = [...m[2].matchAll(/(#[0-9a-fA-F]{3,8})\s+([\d.]+)%/g)].map((mm) => ({
    color: mm[1],
    pct: parseFloat(mm[2]) / 100,
  }));
  return { angleDeg, stops };
}

/** Renders one of the app's existing scenic gradient strings as a real canvas background. */
export function drawGradientBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cssGradient: string) {
  const parsed = parseLinearGradient(cssGradient);
  if (!parsed || parsed.stops.length === 0) {
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const angleRad = (parsed.angleDeg * Math.PI) / 180;
  const dx = Math.sin(angleRad);
  const dy = -Math.cos(angleRad);
  const cx = w / 2;
  const cy = h / 2;
  const halfLen = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  const grad = ctx.createLinearGradient(cx - dx * halfLen, cy - dy * halfLen, cx + dx * halfLen, cy + dy * halfLen);
  for (const s of parsed.stops) grad.addColorStop(Math.min(1, Math.max(0, s.pct)), s.color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
