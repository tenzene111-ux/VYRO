import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarCheck, PlayCircle, FileText, Users, Loader2, Check, Share2, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTodayCheckin, claimDailyCheckin, getTodayRewardedWatchCount, listReferrals } from "../lib/api";

export function Rewards() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [checkedInToday, setCheckedInToday] = useState<boolean | undefined>(undefined);
  const [watchCount, setWatchCount] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    getTodayCheckin(user.id).then((c) => setCheckedInToday(!!c));
    getTodayRewardedWatchCount(user.id).then(setWatchCount);
    listReferrals(user.id).then(setReferralCount);
  }, [user]);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await claimDailyCheckin();
      setCheckedInToday(true);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't claim today's reward.");
    } finally {
      setClaiming(false);
    }
  };

  const handleInvite = async () => {
    if (!profile) return;
    const link = `${window.location.origin}${import.meta.env.BASE_URL}signup?ref=${profile.username}`;
    if (navigator.share) {
      await navigator.share({ title: "Join me on VYRO", url: link }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(link).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="mb-1 flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Earn &amp; Rewards</h1>
          <p className="text-[12px] text-mist">Complete tasks and earn coins.</p>
        </div>
      </header>

      <div className="flex flex-col gap-2.5 pb-8 pt-3">
        <RewardRow icon={CalendarCheck} title="Daily Check-in" coins={10}>
          {checkedInToday === undefined ? (
            <Loader2 className="h-4 w-4 animate-spin text-mist" />
          ) : checkedInToday ? (
            <span className="flex items-center gap-1 rounded-full chip px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
              <Check className="h-3.5 w-3.5" /> Done
            </span>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="flex items-center gap-1.5 rounded-full grad-primary px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {claiming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Check-in
            </button>
          )}
        </RewardRow>

        <RewardRow icon={PlayCircle} title="Watch Videos" coins={5}>
          <span className="text-[12px] font-semibold text-mist">{watchCount}/5</span>
        </RewardRow>

        <RewardRow icon={FileText} title="Create a Post" coins={20}>
          <button onClick={() => navigate("/create/post")}>
            <ChevronRight className="h-4.5 w-4.5 text-mist" />
          </button>
        </RewardRow>

        <RewardRow icon={Users} title="Invite Friends" coins={100}>
          <button
            onClick={handleInvite}
            className="flex items-center gap-1.5 rounded-full grad-purple-blue px-3.5 py-1.5 text-[12px] font-semibold text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Invite"}
          </button>
        </RewardRow>

        {referralCount > 0 && (
          <p className="px-1 pt-1 text-[11.5px] text-mist">
            {referralCount} {referralCount === 1 ? "friend has" : "friends have"} joined with your link.
          </p>
        )}
        {error && <p className="px-1 text-[12px] text-rose-400">{error}</p>}
      </div>
    </div>
  );
}

function RewardRow({
  icon: Icon,
  title,
  coins,
  children,
}: {
  icon: typeof CalendarCheck;
  title: string;
  coins: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl glass-card p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl grad-primary">
        <Icon className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink">{title}</p>
        <p className="text-[12px] text-amber-300">+{coins} Coins</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
