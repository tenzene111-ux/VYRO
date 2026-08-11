import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listTransactions, type CoinTransaction } from "../lib/api";

export function Wallet() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<CoinTransaction[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    listTransactions(profile.id).then(setTransactions);
  }, [profile]);

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">VYRO Wallet</h1>
      </header>

      <div className="relative overflow-hidden rounded-3xl p-6 glass-card glow-violet">
        <span className="absolute inset-0 grad-primary opacity-15" />
        <div className="relative flex items-center gap-2 text-mist">
          <Coins className="h-4 w-4" />
          <span className="text-[12px] font-medium">Coin Balance</span>
        </div>
        <p className="relative mt-2 font-display text-4xl font-bold text-ink">
          {(profile?.coins ?? 0).toLocaleString()}
        </p>
        <p className="relative mt-1 text-[11.5px] text-mist">Virtual coins · not real currency</p>
      </div>

      <h2 className="mb-3 mt-6 font-display text-[15px] font-semibold text-ink">Transaction History</h2>

      {transactions === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-mist">No transactions yet.</p>
      ) : (
        <div className="flex flex-col gap-2 pb-8">
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
                  <p className="text-[11px] text-mist">{new Date(t.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <span className={`font-display text-sm font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {positive ? "+" : ""}
                  {t.delta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function describeReason(reason: string) {
  if (reason.startsWith("gift_sent:")) return "Gift sent";
  if (reason.startsWith("gift_received:")) return "Gift received";
  if (reason === "signup_bonus") return "Welcome bonus";
  return reason;
}
