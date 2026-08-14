export type FilterSettings = {
  preset: string | null;
  brightness: number; // 100 = normal
  contrast: number; // 100 = normal
  saturation: number; // 100 = normal
  temperature: number; // -100..100, warm/cool via hue-rotate + sepia mix
  vignette: number; // 0..100
  grain: number; // 0..100
};

export const DEFAULT_FILTER: FilterSettings = {
  preset: null,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  vignette: 0,
  grain: 0,
};

export type PhotoMotion = "none" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right";
export type FitMode = "crop" | "fit-blur";

export type ShortClip = {
  id: string;
  kind: "video" | "photo";
  blobKey: string;
  sourceDurationSec: number;
  trimStartSec: number;
  trimEndSec: number;
  speed: number;
  volume: number;
  muted: boolean;
  filter: FilterSettings;
  photoDurationSec: number;
  photoMotion: PhotoMotion;
  fitMode: FitMode;
};

export type TextAnimation = "none" | "fade" | "pop" | "slide" | "typewriter" | "bounce";

export type TextOverlay = {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  color: string;
  background: string | null;
  animation: TextAnimation;
  startSec: number;
  endSec: number;
};

export type CaptionSegment = {
  id: string;
  text: string;
  startSec: number;
  endSec: number;
};

export type CaptionStyle = "minimal" | "bold" | "karaoke" | "neon";

export type AudioTrack = {
  id: string;
  kind: "music" | "voiceover";
  name: string;
  blobKey: string;
  startSec: number;
  trimStartSec: number;
  trimEndSec: number;
  sourceDurationSec: number;
  volume: number;
};

export type Visibility = "everyone" | "followers" | "only_me";

export type PublishState =
  | "draft"
  | "rendering"
  | "uploading"
  | "publishing"
  | "published"
  | "failed";

export type RemixType = "duet" | "stitch";

export type ShortProject = {
  id: string;
  createdAt: number;
  updatedAt: number;
  clips: ShortClip[];
  texts: TextOverlay[];
  captions: CaptionSegment[];
  captionsEnabled: boolean;
  captionStyle: CaptionStyle;
  audioTracks: AudioTrack[];
  coverBlobKey: string | null;
  coverAtSec: number;
  caption: string;
  visibility: Visibility;
  commentsEnabled: boolean;
  status: PublishState;
  publishError: string | null;
  publishedPostId: string | null;
  remix: { type: RemixType; sourcePostId: string } | null;
};

export function totalDuration(project: ShortProject): number {
  return project.clips.reduce((sum, c) => sum + clipDuration(c), 0);
}

export function clipDuration(c: ShortClip): number {
  if (c.kind === "photo") return c.photoDurationSec;
  return Math.max(0.1, (c.trimEndSec - c.trimStartSec) / c.speed);
}

export function newProjectId(): string {
  return crypto.randomUUID();
}

export function createEmptyProject(): ShortProject {
  const now = Date.now();
  return {
    id: newProjectId(),
    createdAt: now,
    updatedAt: now,
    clips: [],
    texts: [],
    captions: [],
    captionsEnabled: false,
    captionStyle: "minimal",
    audioTracks: [],
    coverBlobKey: null,
    coverAtSec: 0,
    caption: "",
    visibility: "everyone",
    commentsEnabled: true,
    status: "draft",
    publishError: null,
    publishedPostId: null,
    remix: null,
  };
}
