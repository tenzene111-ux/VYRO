import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoMark } from "../components/Logo";

export function Splash() {
  const navigate = useNavigate();
  const [showTag, setShowTag] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTag(true), 700);
    const t2 = setTimeout(() => navigate("/login"), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col items-center justify-center bg-vyro-radial">
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <span className="absolute inset-0 -m-6 rounded-full grad-primary opacity-40 blur-3xl animate-glow-pulse" />
        <LogoMark size={92} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-6 font-display text-3xl font-bold tracking-wide text-gradient"
      >
        VYRO
      </motion.h1>

      {showTag && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-2 text-[13px] font-medium text-mist"
        >
          Your World. Your People. Your Voice.
        </motion.p>
      )}
    </div>
  );
}
