export type LiveCaptionEvent = { text: string; atSec: number };

interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechWindow = Window & {
  webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  SpeechRecognition?: new () => MinimalSpeechRecognition;
};

export function isLiveCaptionSupported(): boolean {
  const w = window as SpeechWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startLiveTranscription(onSegment: (event: LiveCaptionEvent) => void): { stop: () => void } | null {
  const w = window as SpeechWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = navigator.language || "en-US";

  const startedAt = performance.now();

  recognition.onresult = (event: unknown) => {
    const results = (event as { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }).results;
    const last = results[results.length - 1];
    if (last && last.isFinal) {
      const text = last[0].transcript.trim();
      if (text) onSegment({ text, atSec: (performance.now() - startedAt) / 1000 });
    }
  };
  recognition.onerror = () => {};
  recognition.onend = () => {};

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    },
  };
}
