// Self-contained premium "photo" gradients — no external image dependency.
// Each entry mimics a mood (mountain dusk, festival lights, aurora, etc.)
export const scenicGradients = [
  "linear-gradient(160deg, #1a1035 0%, #3a1d5e 30%, #7c3f6e 55%, #d9784f 78%, #f4b860 100%)",
  "linear-gradient(155deg, #060b1f 0%, #12234a 35%, #1f3f6b 60%, #3d7a9e 85%, #7fc9d9 100%)",
  "linear-gradient(150deg, #100a2e 0%, #351a52 30%, #7a2d6e 55%, #c94f7c 78%, #f2836b 100%)",
  "linear-gradient(160deg, #05070f 0%, #12122a 25%, #241b4d 50%, #4c2f7a 75%, #8b5cf6 100%)",
  "linear-gradient(150deg, #061421 0%, #0c2f3f 30%, #135b62 55%, #1f9a8a 78%, #6fe3c4 100%)",
  "linear-gradient(160deg, #1c0a2e 0%, #401a4a 30%, #7a2151 55%, #c93b6a 78%, #ff8a5c 100%)",
  "linear-gradient(155deg, #030712 0%, #0b1330 30%, #1c2c66 55%, #3956a8 78%, #7fd7f0 100%)",
  "linear-gradient(150deg, #140b2e 0%, #2c1655 28%, #5b1f75 52%, #a3337f 75%, #f2617a 100%)",
];

export function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return scenicGradients[hash % scenicGradients.length];
}

export const avatarPalettes = [
  ["#22d3ee", "#3b82f6"],
  ["#8b5cf6", "#d946ef"],
  ["#f59e0b", "#ef4444"],
  ["#22c55e", "#22d3ee"],
  ["#d946ef", "#f472b6"],
  ["#3b82f6", "#8b5cf6"],
  ["#f97316", "#d946ef"],
  ["#06b6d4", "#6366f1"],
];

export function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 17 + seed.charCodeAt(i)) >>> 0;
  return avatarPalettes[hash % avatarPalettes.length];
}
