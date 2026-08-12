import { DEFAULT_FILTER, type FilterSettings } from "./types";

export const filterPresets: { key: string; label: string; values: Partial<FilterSettings> }[] = [
  { key: "natural", label: "Natural", values: {} },
  { key: "portrait", label: "Portrait", values: { contrast: 106, saturation: 96, brightness: 103 } },
  { key: "cinematic", label: "Cinematic", values: { contrast: 115, saturation: 90, temperature: -12, vignette: 35 } },
  { key: "vintage", label: "Vintage", values: { contrast: 92, saturation: 70, temperature: 22, grain: 30, vignette: 20 } },
  { key: "hdr", label: "HDR", values: { contrast: 122, saturation: 118, brightness: 104 } },
  { key: "night", label: "Night", values: { brightness: 88, contrast: 112, saturation: 85, temperature: -18 } },
  { key: "dream", label: "Dream", values: { brightness: 108, saturation: 80, temperature: 14, vignette: 15 } },
  { key: "futuristic", label: "Futuristic", values: { contrast: 118, saturation: 130, temperature: -25 } },
  { key: "bw", label: "Black & White", values: { saturation: 0, contrast: 112 } },
  { key: "warm", label: "Warm", values: { temperature: 30, saturation: 108 } },
  { key: "cool", label: "Cool", values: { temperature: -30, saturation: 104 } },
];

export function applyPreset(key: string): FilterSettings {
  const preset = filterPresets.find((p) => p.key === key);
  return { ...DEFAULT_FILTER, preset: key, ...(preset?.values ?? {}) };
}

export function filterToCss(f: FilterSettings): string {
  const brightness = f.brightness / 100;
  const contrast = f.contrast / 100;
  const saturate = Math.max(0, f.saturation) / 100;
  const hueRotate = f.temperature * 0.6;
  const sepia = f.temperature > 0 ? Math.min(40, f.temperature) / 100 : 0;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg) sepia(${sepia})`;
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, amount / 100)})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

let grainCanvas: HTMLCanvasElement | null = null;

export function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  if (!grainCanvas) {
    grainCanvas = document.createElement("canvas");
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const gctx = grainCanvas.getContext("2d")!;
    const imageData = gctx.createImageData(128, 128);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.random() * 255;
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 255;
    }
    gctx.putImageData(imageData, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = Math.min(0.35, amount / 300);
  ctx.globalCompositeOperation = "overlay";
  const pattern = ctx.createPattern(grainCanvas, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}
