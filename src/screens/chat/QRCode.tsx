import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { ArrowLeft, Share2, Copy, Check, Camera, ScanLine } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";

type Tab = "code" | "scan";

function profileLink(userId: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}profile/${userId}`;
}

export function QRCodeScreen() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("code");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    QRCode.toDataURL(profileLink(user.id), { width: 260, margin: 2, color: { dark: "#0b0b12", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [user]);

  useEffect(() => {
    if (tab !== "scan") return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setScanError(null);

    const handleDecoded = (data: string) => {
      const prefix = `${window.location.origin}${import.meta.env.BASE_URL}profile/`;
      if (data.startsWith(prefix)) {
        const id = data.slice(prefix.length).split(/[?#]/)[0];
        if (id) {
          navigate(`/profile/${id}`);
          return;
        }
      }
      setScanError("That code isn't a VYRO profile link — point at another one.");
    };

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            handleDecoded(code.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setScanError("Camera access was denied. Allow camera permission in your browser to scan a code."));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [tab, navigate]);

  const handleShare = async () => {
    if (!user) return;
    const link = profileLink(user.id);
    if (navigator.share) {
      await navigator.share({ title: `${profile?.name ?? "My"} VYRO profile`, url: link }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(link).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCopy = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(profileLink(user.id)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex min-h-svh flex-col px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">QR Code</h1>
      </header>

      <div className="mb-5 flex items-center gap-2 rounded-full chip p-1">
        <button
          onClick={() => setTab("code")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12.5px] font-semibold ${
            tab === "code" ? "grad-purple-blue text-white" : "text-mist"
          }`}
        >
          <ScanLine className="h-3.5 w-3.5" /> My Code
        </button>
        <button
          onClick={() => setTab("scan")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12.5px] font-semibold ${
            tab === "scan" ? "grad-purple-blue text-white" : "text-mist"
          }`}
        >
          <Camera className="h-3.5 w-3.5" /> Scan
        </button>
      </div>

      {tab === "code" ? (
        <div className="flex flex-1 flex-col items-center">
          <div className="mb-5 flex flex-col items-center gap-2">
            <Avatar name={profile?.name ?? "You"} avatarUrl={profile?.avatar_url} size={56} />
            <p className="font-display text-base font-bold text-ink">{profile?.name}</p>
            <p className="text-[12px] text-mist">@{profile?.username}</p>
          </div>

          <div className="mb-6 flex items-center justify-center rounded-3xl bg-white p-4">
            {qrDataUrl ? <img src={qrDataUrl} alt="Your VYRO QR code" className="h-[220px] w-[220px]" /> : <div className="h-[220px] w-[220px]" />}
          </div>

          <p className="mb-6 max-w-[260px] text-center text-[12px] text-mist">
            People who scan this code will open your VYRO profile.
          </p>

          <div className="flex w-full max-w-[280px] gap-2">
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full grad-purple-blue py-2.5 text-[12.5px] font-semibold text-white"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full chip py-2.5 text-[12.5px] font-semibold text-ink"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center">
          <div className="relative mb-4 aspect-square w-full max-w-[300px] overflow-hidden rounded-3xl bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/60" />
          </div>
          <p className="max-w-[260px] text-center text-[12.5px] text-mist">
            {scanError ?? "Point your camera at a VYRO QR code to open that person's profile."}
          </p>
        </div>
      )}
    </div>
  );
}
