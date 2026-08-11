import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, FileText, Heart, MessageSquare, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getCreatorStats, type CreatorStats } from "../lib/api";

export function CreatorStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<CreatorStats | null>(null);

  useEffect(() => {
    if (!user) return;
    getCreatorStats(user.id).then(setStats);
  }, [user]);

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Creator Studio</h1>
      </header>

      {stats === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 pb-4">
            <StatCard icon={Users} label="Followers" value={stats.followers} color="text-cyan-300" />
            <StatCard icon={UserPlus} label="Following" value={stats.following} color="text-blue-300" />
            <StatCard icon={FileText} label="Posts" value={stats.posts} color="text-violet-300" />
            <StatCard icon={Heart} label="Total Likes" value={stats.totalLikes} color="text-rose-300" />
          </div>

          <div className="flex items-center gap-3 rounded-2xl glass-card p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-ink">{stats.totalComments.toLocaleString()}</p>
              <p className="text-[11.5px] text-mist">Total comments received across all your posts</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl glass-card p-4">
            <p className="mb-1 text-[13px] font-semibold text-ink">Engagement per post</p>
            <p className="text-[12px] text-mist">
              On average, each of your posts gets{" "}
              <span className="font-semibold text-ink">
                {stats.posts > 0 ? (stats.totalLikes / stats.posts).toFixed(1) : "0"}
              </span>{" "}
              likes and{" "}
              <span className="font-semibold text-ink">
                {stats.posts > 0 ? (stats.totalComments / stats.posts).toFixed(1) : "0"}
              </span>{" "}
              comments.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl glass-card p-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ${color}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value.toLocaleString()}</p>
      <p className="text-[11.5px] text-mist">{label}</p>
    </div>
  );
}
