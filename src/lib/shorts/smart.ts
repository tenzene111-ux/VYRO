import { getBlob } from "./db";
import type { ShortClip } from "./types";

async function decodeAudio(blob: Blob): Promise<AudioBuffer | null> {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    ctx.close();
    return buffer;
  } catch {
    return null;
  }
}

/** Detects leading/trailing near-silence in a clip's audio track using its RMS envelope. */
export async function detectSilenceTrim(clip: ShortClip): Promise<{ trimStartSec: number; trimEndSec: number } | null> {
  if (clip.kind !== "video") return null;
  const blob = await getBlob(clip.blobKey);
  if (!blob) return null;
  const buffer = await decodeAudio(blob);
  if (!buffer) return null;

  const data = buffer.getChannelData(0);
  const windowSize = Math.floor(buffer.sampleRate * 0.1);
  const threshold = 0.02;

  let startSample = 0;
  for (let i = 0; i < data.length; i += windowSize) {
    const slice = data.subarray(i, Math.min(i + windowSize, data.length));
    const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / slice.length);
    if (rms > threshold) {
      startSample = i;
      break;
    }
  }

  let endSample = data.length;
  for (let i = data.length - windowSize; i > 0; i -= windowSize) {
    const slice = data.subarray(Math.max(0, i), Math.min(i + windowSize, data.length));
    const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / slice.length);
    if (rms > threshold) {
      endSample = i + windowSize;
      break;
    }
  }

  const trimStartSec = Math.min(clip.sourceDurationSec * 0.4, startSample / buffer.sampleRate);
  const trimEndSec = Math.max(trimStartSec + 0.3, Math.min(clip.sourceDurationSec, endSample / buffer.sampleRate));
  if (trimStartSec < 0.15 && trimEndSec > clip.sourceDurationSec - 0.15) return null;
  return { trimStartSec, trimEndSec };
}

/** Scores several candidate frames of a clip by sharpness/brightness variance and returns the best timestamp. */
export async function pickBestCoverFrame(clip: ShortClip): Promise<number> {
  if (clip.kind === "photo") return 0;
  const blob = await getBlob(clip.blobKey);
  if (!blob) return 0;
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  await new Promise((resolve) => {
    video.onloadeddata = resolve;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 284;
  const ctx = canvas.getContext("2d")!;
  const duration = Math.max(0.2, Math.min(clip.trimEndSec, video.duration) - clip.trimStartSec);
  const candidates = [0.1, 0.35, 0.5, 0.65, 0.9].map((f) => clip.trimStartSec + duration * f);

  let bestScore = -1;
  let bestTime = candidates[0];
  for (const t of candidates) {
    await new Promise<void>((resolve) => {
      video.currentTime = t;
      video.onseeked = () => resolve();
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let sumSq = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum;
      sumSq += lum * lum;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    const brightnessScore = 1 - Math.abs(mean - 130) / 130;
    const score = variance * 0.7 + brightnessScore * 4000 * 0.3;
    if (score > bestScore) {
      bestScore = score;
      bestTime = t;
    }
  }
  URL.revokeObjectURL(url);
  return bestTime;
}

/** Analyzes a frame's luminance histogram and returns brightness/contrast adjustments to normalize exposure. */
export async function autoColorForClip(clip: ShortClip): Promise<{ brightness: number; contrast: number } | null> {
  if (clip.kind !== "video") return null;
  const blob = await getBlob(clip.blobKey);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  await new Promise((resolve) => {
    video.onloadeddata = resolve;
  });
  video.currentTime = clip.trimStartSec + (clip.trimEndSec - clip.trimStartSec) / 2;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 284;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  URL.revokeObjectURL(url);
  const mean = sum / n;
  const brightness = Math.round(Math.max(85, Math.min(120, 100 + (128 - mean) / 3)));
  const contrast = mean < 90 || mean > 170 ? 110 : 104;
  return { brightness, contrast };
}
