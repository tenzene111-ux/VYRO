import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Radio, Globe, Users, Lock, Loader2, VideoOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createLiveSession, goLive } from "../lib/api";

const categories = ["Music", "Gaming", "Chat", "Education", "Food", "Travel", "Creative"];

const privacyOptions: { key: "public" | "followers" | "private"; label: string; description: string; icon: typeof Globe }[] = [
  { key: "public", label: "Public", description: "Anyone on VYRO can find and watch", icon: Globe },
  { key: "followers", label: "Followers", description: "Only people who follow you", icon: Users },
  { key: "private", label: "Private", description: "Only people you invite as guests", icon: Lock },
];

export function GoLive() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"setup" | "preview">("setup");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liveId, setLiveId] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && previewStream) videoRef.current.srcObject = previewStream;
  }, [previewStream]);

  useEffect(() => {
    return () => {
      previewStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    if (!user || !title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const session = await createLiveSession(user.id, title.trim(), category.toLowerCase(), privacy);
      setLiveId(session.id);
      setStep("preview");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPreviewStream(stream);
      } catch {
        setCameraError("Couldn't access your camera and microphone. Check your browser permissions.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't set up your live session.");
    } finally {
      setCreating(false);
    }
  };

  const handleStartCountdown = () => {
    if (!previewStream || countdown !== null) return;
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      handleGoLive();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleGoLive = async () => {
    if (!liveId || starting) return;
    setStarting(true);
    try {
      await goLive(liveId);
      previewStream?.getTracks().forEach((t) => t.stop());
      navigate(`/live/${liveId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't go live. Try again.");
      setStarting(false);
      setCountdown(null);
    }
  };

  if (step === "setup") {
    return (
      <div className="flex min-h-screen flex-col px-4 safe-top">
        <header className="flex items-center gap-3 py-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-xl font-bold text-ink">Go Live</h1>
        </header>

        <div className="flex-1 space-y-6 pb-8">
          <div>
            <label className="mb-2 block text-[12.5px] font-medium text-mist">Give your live a title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="What's happening?"
              className="w-full rounded-2xl glass-card px-4 py-3 text-[14px] text-ink outline-none placeholder:text-mist/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-[12.5px] font-medium text-mist">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    category === c ? "grad-purple-blue text-white" : "chip text-mist"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[12.5px] font-medium text-mist">Who can watch</label>
            <div className="space-y-2">
              {privacyOptions.map((opt) => {
                const Icon = opt.icon;
                const active = privacy === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setPrivacy(opt.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-colors ${
                      active ? "glass-strong glow-magenta" : "glass-card"
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? "grad-primary" : "chip"}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{opt.label}</p>
                      <p className="text-[11.5px] text-mist">{opt.description}</p>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-[12.5px] text-rose-400">{error}</p>}
        </div>

        <button
          onClick={handleContinue}
          disabled={!title.trim() || creating}
          className="mb-8 flex items-center justify-center gap-2 rounded-full grad-primary py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        {previewStream ? (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            {cameraError ? (
              <>
                <VideoOff className="h-8 w-8 text-mist" />
                <p className="max-w-[240px] text-[13px] text-mist">{cameraError}</p>
              </>
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-mist" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50" />

        <button
          onClick={() => {
            previewStream?.getTracks().forEach((t) => t.stop());
            navigate(-1);
          }}
          className="absolute left-3 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur safe-top"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="font-display text-7xl font-bold text-white">{countdown}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-5 pb-10">
          <p className="mb-1 font-display text-base font-semibold text-white">{title}</p>
          <p className="mb-4 text-[12px] text-white/70">
            {privacyOptions.find((p) => p.key === privacy)?.label} · {category}
          </p>
          {error && <p className="mb-3 text-[12.5px] text-rose-300">{error}</p>}
          <button
            onClick={handleStartCountdown}
            disabled={!previewStream || countdown !== null || starting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            {starting ? "Going live…" : "Start Live"}
          </button>
        </div>
      </div>
    </div>
  );
}
