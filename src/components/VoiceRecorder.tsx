import { useEffect, useRef, useState } from "react";
import { Mic, X, Send, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { uploadAudioBlob } from "../lib/storage";

function formatElapsed(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceRecorder({
  onSend,
  onRecordingChange,
}: {
  onSend: (audioUrl: string, durationSeconds: number) => void | Promise<void>;
  onRecordingChange?: (recording: boolean) => void;
}) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    onRecordingChange?.(recording);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    const start = Date.now();
    const t = setInterval(() => setElapsed((Date.now() - start) / 1000), 200);
    return () => clearInterval(t);
  }, [recording]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setElapsed(0);
      setRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  };

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    setElapsed(0);
  };

  const handleCancel = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    cleanup();
  };

  const handleSend = async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive" || !user) return;
    const duration = elapsed;
    setUploading(true);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    cleanup();
    try {
      if (blob.size > 200 && duration > 0.4) {
        const url = await uploadAudioBlob(user.id, blob);
        await onSend(url, duration);
      }
    } catch {
      setError("Couldn't send voice message.");
    } finally {
      setUploading(false);
    }
  };

  if (recording) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2">
        <button onClick={handleCancel} disabled={uploading} className="rounded-full p-1 text-mist disabled:opacity-40">
          <X className="h-4.5 w-4.5" />
        </button>
        <span className="flex items-center gap-1.5 text-[13px] text-ink">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          Recording… {formatElapsed(elapsed)}
        </span>
        <button
          onClick={handleSend}
          disabled={uploading}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full grad-primary text-white disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={startRecording}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full chip text-mist transition-transform active:scale-95"
      >
        <Mic className="h-4.5 w-4.5" />
      </button>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </>
  );
}
