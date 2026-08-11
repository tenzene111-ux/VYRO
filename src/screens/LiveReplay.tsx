import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Film, Eye, Gift as GiftIcon, Clock } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { getLiveSession, getLiveAnalytics, type LiveSessionWithHost, type LiveAnalytics } from "../lib/api";

export function LiveReplay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveSessionWithHost | null>(null);
  const [analytics, setAnalytics] = useState<LiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getLiveSession(id).then(async (data) => {
      setLive(data);
      if (data) setAnalytics(await getLiveAnalytics(data));
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2 className="h-6 w-6 animate-spin text-mist" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-base font-semibold text-ink">This replay doesn't exist</p>
        <button onClick={() => navigate("/live")} className="rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white">
          Back to Live
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Replay</h1>
      </header>

      <div className="mb-4 overflow-hidden rounded-3xl bg-black">
        {live.replay_ready && live.replay_url ? (
          <video src={live.replay_url} controls playsInline className="aspect-[9/16] w-full object-contain" />
        ) : (
          <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 text-center">
            <Film className="h-7 w-7 text-mist" />
            <p className="text-[12.5px] text-mist">Replay is still processing.</p>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <Avatar name={live.host.name} avatarUrl={live.host.avatar_url} size={40} />
        <div>
          <p className="text-[14px] font-semibold text-ink">{live.host.name}</p>
          <p className="text-[12px] text-mist">{live.title}</p>
        </div>
      </div>

      {analytics && (
        <div className="mb-8 grid grid-cols-3 gap-2.5">
          <div className="flex flex-col items-center gap-1 rounded-2xl glass-card p-3">
            <Eye className="h-4 w-4 text-mist" />
            <p className="text-[13px] font-semibold text-ink">{analytics.peakViewers.toLocaleString()}</p>
            <p className="text-[10px] text-mist">Peak Viewers</p>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl glass-card p-3">
            <GiftIcon className="h-4 w-4 text-mist" />
            <p className="text-[13px] font-semibold text-ink">{analytics.totalGiftCoins.toLocaleString()}</p>
            <p className="text-[10px] text-mist">Gift Coins</p>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl glass-card p-3">
            <Clock className="h-4 w-4 text-mist" />
            <p className="text-[13px] font-semibold text-ink">
              {String(Math.floor(analytics.durationSeconds / 60)).padStart(2, "0")}:
              {String(analytics.durationSeconds % 60).padStart(2, "0")}
            </p>
            <p className="text-[10px] text-mist">Duration</p>
          </div>
        </div>
      )}
    </div>
  );
}
