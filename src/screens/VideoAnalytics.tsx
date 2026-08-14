import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Eye, PlayCircle, Clock } from "lucide-react";
import { getPostBrief, getVideoRetention, type PostBrief } from "../lib/api";
import { formatDuration } from "../lib/shorts/media";

export function VideoAnalytics() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostBrief | null | undefined>(undefined);
  const [retention, setRetention] = useState<{ curve: number[]; sampleSize: number } | null>(null);

  useEffect(() => {
    if (!postId) return;
    getPostBrief(postId).then(setPost).catch(() => setPost(null));
  }, [postId]);

  useEffect(() => {
    if (!post) return;
    getVideoRetention(post.id, post.video_duration_seconds ?? 0)
      .then(setRetention)
      .catch(() => setRetention({ curve: [], sampleSize: 0 }));
  }, [post]);

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Video Analytics</h1>
      </header>

      {post === undefined ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : post === null ? (
        <p className="py-16 text-center text-[13px] text-mist">This video couldn't be found.</p>
      ) : (
        <>
          <div className="mb-4 flex gap-3">
            <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-black/40">
              {post.cover_url && <img src={post.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-ink">Duration {formatDuration(post.video_duration_seconds ?? 0)}</p>
              <p className="mt-1 text-[11.5px] text-mist">
                Retention is built from real watch sessions — how far each viewer got before scrolling away.
              </p>
            </div>
          </div>

          {retention === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-mist" />
            </div>
          ) : retention.sampleSize === 0 ? (
            <div className="rounded-2xl glass-card p-4 text-center text-[12px] text-mist">
              No watch data yet. Once people watch this video, retention will show up here.
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl glass-card p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
                    <Eye className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-2 font-display text-2xl font-bold text-ink">{retention.sampleSize.toLocaleString()}</p>
                  <p className="text-[11.5px] text-mist">Views</p>
                </div>
                <div className="rounded-2xl glass-card p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <PlayCircle className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-2 font-display text-2xl font-bold text-ink">{retention.curve[retention.curve.length - 1] ?? 0}%</p>
                  <p className="text-[11.5px] text-mist">Watched to the end</p>
                </div>
              </div>

              <div className="rounded-2xl glass-card p-4">
                <p className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                  <Clock className="h-4 w-4 text-mist" /> Audience retention
                </p>
                <div className="flex h-36 items-end gap-1.5">
                  {retention.curve.map((pct, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="relative flex h-28 w-full items-end overflow-hidden rounded-md bg-white/5">
                        <div className="w-full grad-purple-blue transition-all" style={{ height: `${Math.max(2, pct)}%` }} />
                      </div>
                      <span className="text-[9px] text-mist">{Math.round((i / (retention.curve.length - 1)) * 100)}%</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[10.5px] text-mist">% of viewers still watching · by point in the video</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
