import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Gift, Share2, FileText, PlayCircle, Loader2, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTodayCheckin, getCurrentStreak, claimDailyCheckin, listReferrals, type DailyCheckin } from "../lib/api";

export function Rewards() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null | undefined>(undefined);
  const [streak, setStreak] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    getTodayCheckin(user.id).then(setTodayCheckin);
    getCurrentStreak(user.id).then(setStreak);
    listReferrals(user.id).then(setReferralCount);
  }, [user]);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const { streak: newStreak, reward } = await claimDailyCheckin();
      setStreak(newStreak);
      setTodayCheckin({ checkin_date: new Date().toISOString().slice(0, 10), streak_count: newStreak, reward_coins: reward });
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't claim today's reward.");
    } finally {
      setClaiming(false);
    }
  };

  const referralLink = profile ? `${window.location.origin}${import.meta.env.BASE_URL}signup?ref=${profile.username}` : "";

  const handleShareInvite = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Join me on VYRO", url: referralLink }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(referralLink).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nextReward = Math.min(10 + streak * 5, 40);

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Rewards</h1>
      </header>

      {/* Daily check-in */}
      <div className="mb-4 overflow-hidden rounded-3xl glass-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-400" />
          <p className="font-display text-base font-bold text-ink">Daily Check-in</p>
        </div>
        <p className="mb-4 text-[12.5px] text-mist">Check in every day to build your streak and earn more coins.</p>

        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-mist">Current streak</p>
            <p className="font-display text-2xl font-bold text-ink">{streak} {streak === 1 ? "day" : "days"}</p>
          </div>
          {!todayCheckin && (
            <div className="text-right">
              <p className="text-[11px] text-mist">Today's reward</p>
              <p className="text-sm font-semibold text-amber-300">🪙 {nextReward}</p>
            </div>
          )}
        </div>

        {todayCheckin === undefined ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : todayCheckin ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl chip py-3 text-sm font-semibold text-emerald-300">
            <Check className="h-4 w-4" /> Checked in — earned 🪙 {todayCheckin.reward_coins} today
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="flex w-full items-center justify-center gap-2 rounded-2xl grad-primary py-3 text-sm font-bold text-white glow-violet disabled:opacity-50"
          >
            {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
            Check In
          </button>
        )}
        {error && <p className="mt-2 text-[12px] text-rose-400">{error}</p>}
      </div>

      {/* Invite friends */}
      <div className="mb-4 overflow-hidden rounded-3xl glass-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Gift className="h-5 w-5 text-violet-300" />
          <p className="font-display text-base font-bold text-ink">Invite Friends</p>
        </div>
        <p className="mb-4 text-[12.5px] text-mist">
          Earn 🪙 100 for every friend who joins with your link — they get 🪙 50 to start.
        </p>
        <p className="mb-3 text-[12px] text-mist">
          {referralCount} {referralCount === 1 ? "friend" : "friends"} joined so far
        </p>
        <button
          onClick={handleShareInvite}
          className="flex w-full items-center justify-center gap-2 rounded-2xl grad-purple-blue py-3 text-sm font-bold text-white"
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {copied ? "Link copied" : "Share Invite Link"}
        </button>
      </div>

      {/* Passive rewards */}
      <div className="mb-8 flex flex-col gap-3">
        <RewardTile
          icon={FileText}
          title="Create a post"
          desc="Earn 🪙 5 for each of your first 3 posts every day."
        />
        <RewardTile
          icon={PlayCircle}
          title="Watch videos"
          desc="Earn 🪙 2 for each of your first 10 completed watches every day."
        />
      </div>
    </div>
  );
}

function RewardTile({ icon: Icon, title, desc }: { icon: typeof FileText; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl glass-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl grad-primary">
        <Icon className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="text-[11.5px] text-mist">{desc}</p>
      </div>
      <span className="shrink-0 rounded-full chip px-2.5 py-1 text-[10px] font-semibold text-emerald-300">Automatic</span>
    </div>
  );
}

