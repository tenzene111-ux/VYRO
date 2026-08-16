import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoMark } from "../components/Logo";
import { BhutanSkyline } from "../components/BhutanSkyline";
import { useAuth } from "../context/AuthContext";

export function Splash() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [showTag, setShowTag] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTag(true), 700);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (loading) return;
    const t2 = setTimeout(() => navigate(session ? "/home" : "/login"), 1600);
    return () => clearTimeout(t2);
  }, [loading, session, navigate]);

  return (
    <div className="theme-dark-forced fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col items-center justify-center">
      <BhutanSkyline />
      <div className="relative animate-splash-logo">
        <span className="absolute inset-0 -m-6 rounded-full grad-primary opacity-40 blur-3xl animate-glow-pulse" />
        <LogoMark size={92} />
      </div>

      <h1
        className="mt-6 animate-splash-rise font-display text-3xl font-bold tracking-wide text-gradient"
        style={{ animationDelay: "0.35s" }}
      >
        VYRO
      </h1>

      {showTag && (
        <div className="mt-2 flex animate-splash-rise flex-col items-center gap-0.5">
          <p className="text-[13px] font-semibold text-ink">Create • Share • Earn</p>
          <p className="text-[11.5px] text-mist">The Next Gen Bhutanese Social &amp; Video App</p>
        </div>
      )}
    </div>
  );
}
