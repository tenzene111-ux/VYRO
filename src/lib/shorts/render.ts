import { getBlob } from "./db";
import { clipDuration, totalDuration, type ShortClip, type ShortProject, type TextOverlay, type CaptionSegment } from "./types";
import { filterToCss, drawVignette, drawGrain } from "./filters";

const WIDTH = 1080;
const HEIGHT = 1920;

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number) {
  const targetRatio = WIDTH / HEIGHT;
  const srcRatio = sw / sh;
  let sx = 0, sy = 0, cw = sw, ch = sh;
  if (srcRatio > targetRatio) {
    cw = sh * targetRatio;
    sx = (sw - cw) / 2;
  } else {
    ch = sw / targetRatio;
    sy = (sh - ch) / 2;
  }
  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, WIDTH, HEIGHT);
}

function drawFitBlur(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number) {
  ctx.save();
  ctx.filter = "blur(28px) brightness(0.6)";
  drawCover(ctx, source, sw, sh);
  ctx.filter = "none";
  ctx.restore();

  const targetRatio = WIDTH / HEIGHT;
  const srcRatio = sw / sh;
  let dw = WIDTH, dh = HEIGHT;
  if (srcRatio > targetRatio) {
    dh = WIDTH / srcRatio;
  } else {
    dw = HEIGHT * srcRatio;
  }
  const dx = (WIDTH - dw) / 2;
  const dy = (HEIGHT - dh) / 2;
  ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
}

function drawText(ctx: CanvasRenderingContext2D, t: TextOverlay) {
  ctx.save();
  const x = t.x * WIDTH;
  const y = t.y * HEIGHT;
  ctx.translate(x, y);
  ctx.rotate((t.rotation * Math.PI) / 180);
  const fontSize = t.fontSize * (WIDTH / 400);
  ctx.font = `700 ${fontSize}px "Sora", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const metrics = ctx.measureText(t.text);
  if (t.background) {
    ctx.fillStyle = t.background;
    const pad = fontSize * 0.35;
    ctx.fillRect(-metrics.width / 2 - pad, -fontSize / 2 - pad * 0.6, metrics.width + pad * 2, fontSize + pad * 1.2);
  }
  ctx.fillStyle = t.color;
  ctx.fillText(t.text, 0, 0);
  ctx.restore();
}

function drawCaption(ctx: CanvasRenderingContext2D, seg: CaptionSegment, style: string) {
  ctx.save();
  const fontSize = WIDTH * 0.052;
  ctx.font = `700 ${fontSize}px "Sora", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const y = HEIGHT - fontSize * 2.2;
  const metrics = ctx.measureText(seg.text);
  if (style !== "minimal") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const pad = fontSize * 0.4;
    ctx.fillRect(WIDTH / 2 - metrics.width / 2 - pad, y - fontSize / 2 - pad * 0.5, metrics.width + pad * 2, fontSize + pad);
  }
  ctx.fillStyle = style === "neon" ? "#67e8f9" : style === "karaoke" ? "#fcd34d" : "#ffffff";
  if (style === "neon") {
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 18;
  }
  ctx.fillText(seg.text, WIDTH / 2, y);
  ctx.restore();
}

export type RenderProgress = (fraction: number) => void;

export async function renderProject(project: ShortProject, onProgress?: RenderProgress): Promise<Blob> {
  if (project.clips.length === 0) throw new Error("Add at least one clip before publishing.");

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering isn't supported on this device.");

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();

  const clipUrls = await Promise.all(
    project.clips.map(async (c) => {
      const blob = await getBlob(c.blobKey);
      return blob ? URL.createObjectURL(blob) : null;
    })
  );

  const videoEl = document.createElement("video");
  videoEl.muted = false;
  videoEl.playsInline = true;
  const videoSource = audioCtx.createMediaElementSource(videoEl);
  const videoGain = audioCtx.createGain();
  videoSource.connect(videoGain).connect(dest);

  const imgEl = document.createElement("img");

  let musicGain: GainNode | null = null;
  let musicEl: HTMLAudioElement | null = null;
  const musicTrack = project.audioTracks.find((a) => a.kind === "music");
  if (musicTrack) {
    const blob = await getBlob(musicTrack.blobKey);
    if (blob) {
      musicEl = new Audio(URL.createObjectURL(blob));
      const src = audioCtx.createMediaElementSource(musicEl);
      musicGain = audioCtx.createGain();
      musicGain.gain.value = musicTrack.volume;
      src.connect(musicGain).connect(dest);
    }
  }

  let voiceEl: HTMLAudioElement | null = null;
  const voiceTrack = project.audioTracks.find((a) => a.kind === "voiceover");
  if (voiceTrack) {
    const blob = await getBlob(voiceTrack.blobKey);
    if (blob) {
      voiceEl = new Audio(URL.createObjectURL(blob));
      const src = audioCtx.createMediaElementSource(voiceEl);
      const gain = audioCtx.createGain();
      gain.gain.value = voiceTrack.volume;
      src.connect(gain).connect(dest);
    }
  }

  const total = totalDuration(project);
  const starts: number[] = [];
  let acc = 0;
  for (const c of project.clips) {
    starts.push(acc);
    acc += clipDuration(c);
  }

  let clipIndex = 0;
  let photoStart = 0;
  let stopped = false;

  const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(combined, { mimeType: pickMimeType(), videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const drawFrame = () => {
    if (stopped) return;
    const clip = project.clips[clipIndex];
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (clip.kind === "video" && videoEl.readyState >= 2) {
      ctx.save();
      ctx.filter = filterToCss(clip.filter);
      if (clip.fitMode === "fit-blur") {
        drawFitBlur(ctx, videoEl, videoEl.videoWidth || WIDTH, videoEl.videoHeight || HEIGHT);
      } else {
        drawCover(ctx, videoEl, videoEl.videoWidth || WIDTH, videoEl.videoHeight || HEIGHT);
      }
      ctx.restore();
      drawVignette(ctx, WIDTH, HEIGHT, clip.filter.vignette);
      drawGrain(ctx, WIDTH, HEIGHT, clip.filter.grain);
    } else if (clip.kind === "photo" && imgEl.complete && imgEl.naturalWidth > 0) {
      const progress = Math.min(1, (performance.now() - photoStart) / (clip.photoDurationSec * 1000));
      ctx.save();
      let scale = 1;
      let tx = 0;
      if (clip.photoMotion === "zoom-in") scale = 1 + 0.18 * progress;
      else if (clip.photoMotion === "zoom-out") scale = 1.18 - 0.18 * progress;
      else if (clip.photoMotion === "pan-left") { scale = 1.15; tx = -60 * progress; }
      else if (clip.photoMotion === "pan-right") { scale = 1.15; tx = 60 * (progress - 1); }
      ctx.translate(WIDTH / 2 + tx, HEIGHT / 2);
      ctx.scale(scale, scale);
      ctx.translate(-WIDTH / 2, -HEIGHT / 2);
      ctx.filter = filterToCss(clip.filter);
      drawCover(ctx, imgEl, imgEl.naturalWidth, imgEl.naturalHeight);
      ctx.restore();
      drawVignette(ctx, WIDTH, HEIGHT, clip.filter.vignette);
      drawGrain(ctx, WIDTH, HEIGHT, clip.filter.grain);
    }

    const globalTime = starts[clipIndex] + localOutputTime(clip, videoEl, photoStart);
    for (const t of project.texts) {
      if (globalTime >= t.startSec && globalTime <= t.endSec) drawText(ctx, t);
    }
    if (project.captionsEnabled) {
      const seg = project.captions.find((c) => globalTime >= c.startSec && globalTime <= c.endSec);
      if (seg) drawCaption(ctx, seg, project.captionStyle);
    }

    onProgress?.(Math.min(1, globalTime / Math.max(0.001, total)));
    requestAnimationFrame(drawFrame);
  };

  function localOutputTime(clip: ShortClip, video: HTMLVideoElement, photoStartedAt: number): number {
    if (clip.kind === "video") {
      return Math.max(0, (video.currentTime - clip.trimStartSec) / clip.speed);
    }
    return Math.min(clip.photoDurationSec, (performance.now() - photoStartedAt) / 1000);
  }

  async function playClip(index: number): Promise<void> {
    const clip = project.clips[index];
    const url = clipUrls[index];
    if (!url) return;

    if (clip.kind === "video") {
      videoGain.gain.value = clip.muted ? 0 : clip.volume;
      videoEl.src = url;
      videoEl.playbackRate = clip.speed;
      await new Promise<void>((resolve) => {
        videoEl.onloadeddata = () => resolve();
      });
      videoEl.currentTime = clip.trimStartSec;
      await videoEl.play();
      await new Promise<void>((resolve) => {
        const onTime = () => {
          if (videoEl.currentTime >= clip.trimEndSec - 0.03 || videoEl.ended) {
            videoEl.removeEventListener("timeupdate", onTime);
            videoEl.pause();
            resolve();
          }
        };
        videoEl.addEventListener("timeupdate", onTime);
      });
    } else {
      imgEl.src = url;
      await new Promise<void>((resolve) => {
        imgEl.onload = () => resolve();
      });
      photoStart = performance.now();
      await new Promise<void>((resolve) => setTimeout(resolve, clip.photoDurationSec * 1000));
    }
  }

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      stopped = true;
      videoSource.disconnect();
      clipUrls.forEach((u) => u && URL.revokeObjectURL(u));
      audioCtx.close().catch(() => {});
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
    recorder.onerror = () => reject(new Error("Rendering failed."));

    recorder.start(250);
    requestAnimationFrame(drawFrame);
    musicEl?.play().catch(() => {});
    voiceEl?.play().catch(() => {});

    (async () => {
      try {
        for (clipIndex = 0; clipIndex < project.clips.length; clipIndex++) {
          await playClip(clipIndex);
        }
        musicEl?.pause();
        voiceEl?.pause();
        recorder.stop();
      } catch (e) {
        stopped = true;
        recorder.stop();
        reject(e instanceof Error ? e : new Error("Rendering failed."));
      }
    })();
  });
}

export async function extractCoverFrame(project: ShortProject, atSec: number): Promise<Blob | null> {
  let acc = 0;
  let target: { clip: (typeof project.clips)[number]; localSec: number } | null = null;
  for (const c of project.clips) {
    const d = clipDuration(c);
    if (atSec <= acc + d || c === project.clips[project.clips.length - 1]) {
      target = { clip: c, localSec: atSec - acc };
      break;
    }
    acc += d;
  }
  if (!target) return null;
  const blob = await getBlob(target.clip.blobKey);
  if (!blob) return null;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const url = URL.createObjectURL(blob);
  try {
    if (target.clip.kind === "photo") {
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => (img.onload = resolve));
      drawCover(ctx, img, img.naturalWidth, img.naturalHeight);
    } else {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      await new Promise((resolve) => (video.onloadeddata = resolve));
      video.currentTime = target.clip.trimStartSec + Math.max(0, target.localSec);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
      if (target.clip.fitMode === "fit-blur") {
        drawFitBlur(ctx, video, video.videoWidth, video.videoHeight);
      } else {
        drawCover(ctx, video, video.videoWidth, video.videoHeight);
      }
    }
  } finally {
    URL.revokeObjectURL(url);
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}
