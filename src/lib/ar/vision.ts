import { FilesetResolver, ImageSegmenter, FaceLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

// Real on-device ML (Google's MediaPipe), runs entirely in the browser — no account,
// no server, no cost. Model weights are fetched from Google's public CDN the first
// time a feature is used (and cached by the browser after that), so it needs the
// end user's normal internet access, same as loading any other asset.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
function getFileset() {
  if (!filesetPromise) filesetPromise = FilesetResolver.forVisionTasks(WASM_BASE);
  return filesetPromise;
}

let segmenterPromise: Promise<ImageSegmenter> | null = null;
export function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = getFileset().then((fileset) =>
      ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: SEGMENTER_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      })
    );
  }
  return segmenterPromise;
}

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;
export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = getFileset().then((fileset) =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      })
    );
  }
  return faceLandmarkerPromise;
}

export type PersonMask = { data: Float32Array; width: number; height: number };

/** Runs real segmentation on a video frame; returns a person-confidence mask (0..1 per pixel). */
export function segmentFrame(segmenter: ImageSegmenter, video: HTMLVideoElement, timestampMs: number): PersonMask | null {
  const result = segmenter.segmentForVideo(video, timestampMs);
  const mask = result.confidenceMasks?.[0];
  if (!mask) return null;
  const data = mask.getAsFloat32Array();
  const out = { data, width: mask.width, height: mask.height };
  mask.close();
  return out;
}

export type FaceBox = { centerX: number; centerY: number; size: number };

/** Runs real face detection on a video frame; returns a normalized (0..1) bounding box for the primary face. */
export function detectFaceBox(landmarker: FaceLandmarker, video: HTMLVideoElement, timestampMs: number): FaceBox | null {
  const result = landmarker.detectForVideo(video, timestampMs);
  const landmarks: NormalizedLandmark[] | undefined = result.faceLandmarks?.[0];
  if (!landmarks || landmarks.length === 0) return null;
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, size: Math.max(maxX - minX, maxY - minY) };
}
