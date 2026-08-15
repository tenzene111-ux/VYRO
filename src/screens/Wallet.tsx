import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Coins, ArrowDownLeft, ArrowUpRight, Loader2, Gift, Sparkles, Rocket, Award, Star,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listTransactions, type CoinTransaction } from "../lib/api";

const packages = [
  { coins: 170, price: 100 },
  { coins: 350, price: 200 },
  { coins: 850, price: 500 },
  { coins: 1700, price: 1000 },
  { coins: 3400, price: 2000 },
  { coins: 7900, price: 4000 },
];

const useCoinsFor = [
  { icon: Gift, label: "Send Gifts in Live" },
  { icon: Sparkles, label: "Support Creators" },
  { icon: Rocket, label: "Boost Posts" },
  { icon: Award, label: "Premium Badges" },
  { icon: Star, label: "Exclusive Content" },
];

export function Wallet() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<CoinTransaction[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listTransactions(profile.id).then(setTransactions);
  }, [profile]);

  return (
    <div className="min-h-svh bg-vyro-radial px-4 pb-8 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button
          onClick={() => (showHistory ? setShowHistory(false) : navigate(-1))}
          className="rounded-full p-2 chip text-mist"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">VYRO Coins</h1>
      </header>

      {showHistory ? (
        transactions === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-mist">No transactions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((t) => {
              const positive = t.delta > 0;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl glass-card p-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      positive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{describeReason(t.reason)}</p>
                    <p className="text-[11px] text-mist">
                      {new Date(t.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className={`font-display text-sm font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                    {positive ? "+" : ""}
                    {t.delta}
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          <div className="relative overflow-hidden rounded-3xl p-6 glass-card glow-violet">
            <span className="absolute inset-0 grad-primary opacity-15" />
            <div className="relative flex items-center gap-2 text-mist">
              <Coins className="h-4 w-4" />
              <span className="text-[12px] font-medium">My Balance</span>
            </div>
            <p className="relative mt-2 font-display text-4xl font-bold text-ink">
              {(profile?.coins ?? 0).toLocaleString()} Coins
            </p>
          </div>

          {notice && <p className="mt-3 text-center text-[12px] text-mist">{notice}</p>}

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {packages.map((p) => (
              <button
                key={p.coins}
                onClick={() => setNotice("Coin purchases aren't set up yet — no payment provider is connected.")}
                className="flex flex-col items-center gap-1 rounded-2xl glass-card p-3.5 active:scale-[0.97] transition-transform"
              >
                <Coins className="h-5 w-5 text-amber-300" />
                <span className="text-[13px] font-bold text-ink">{p.coins.toLocaleString()}</span>
                <span className="text-[10px] text-mist">Coins</span>
                <span className="mt-1 rounded-full chip px-2 py-0.5 text-[10.5px] font-semibold text-ink">
                  Nu. {p.price.toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          <h2 className="mb-3 mt-6 font-display text-[13px] font-semibold text-ink">Use Coins For</h2>
          <div className="mb-6 overflow-hidden rounded-2xl glass-card">
            {useCoinsFor.map((u) => (
              <div key={u.label} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-b-0">
                <u.icon className="h-4.5 w-4.5 text-violet-300" />
                <span className="text-[13px] text-ink">{u.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowHistory(true)}
            className="w-full rounded-2xl grad-primary py-3.5 text-sm font-bold text-white glow-violet"
          >
            Transaction History
          </button>
        </>
      )}
    </div>
  );
}

function describeReason(reason: string) {
  if (reason.startsWith("gift_sent:")) return "Gift sent";
  if (reason.startsWith("gift_received:")) return "Gift received";
  if (reason === "signup_bonus") return "Welcome bonus";
  if (reason === "reward:daily_checkin") return "Daily check-in reward";
  if (reason === "reward:create_post") return "Post creation reward";
  if (reason === "reward:watch_video") return "Watch video reward";
  if (reason === "reward:referral_bonus") return "Referral bonus";
  if (reason === "reward:referral_welcome") return "Welcome bonus (referred)";
  return reason;
}
