export type VideoProbe = {
  durationSec: number;
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
};

export function probeVideo(file: Blob): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      resolve({
        durationSec: Number.isFinite(video.duration) ? video.duration : 0,
        width,
        height,
        orientation: width === height ? "square" : width > height ? "landscape" : "portrait",
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read this video file."));
    };
  });
}

export type ImageProbe = { width: number; height: number; orientation: "portrait" | "landscape" | "square" };

export function probeImage(file: Blob): Promise<ImageProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      resolve({ width, height, orientation: width === height ? "square" : width > height ? "landscape" : "portrait" });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read this image file."));
    };
    img.src = url;
  });
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
