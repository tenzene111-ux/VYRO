import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Camera, Clapperboard, Radio, Users, CalendarPlus, Tag, X } from "lucide-react";
import { useUI } from "../context/UIContext";

const options = [
  { label: "Post", desc: "Text, photo, poll or link", icon: FileText, to: "/create/post", grad: "from-cyan-400 to-blue-500" },
  { label: "Story", desc: "Photo, video or text", icon: Camera, to: "/create/story", grad: "from-fuchsia-400 to-purple-500" },
  { label: "Short Video", desc: "Camera, effects, music", icon: Clapperboard, to: "/create/reel", grad: "from-orange-400 to-pink-500" },
  { label: "Go Live", desc: "Stream to the world", icon: Radio, to: "/live/go", grad: "from-red-500 to-rose-500" },
  { label: "Group", desc: "Start a community", icon: Users, to: "/create/group", grad: "from-emerald-400 to-cyan-500" },
  { label: "Event", desc: "Date, place, invites", icon: CalendarPlus, to: "/create/event", grad: "from-violet-400 to-indigo-500" },
  { label: "Sell", desc: "List on Marketplace", icon: Tag, to: "/create/sell", grad: "from-amber-400 to-orange-500" },
];

export function CreateMenu() {
  const { createOpen, setCreateOpen } = useUI();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {createOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setCreateOpen(false)}
        >
          <motion.div
            className="relative mb-24 w-[calc(100%-32px)] max-w-[420px] overflow-hidden rounded-3xl glass-strong p-4 glow-violet"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="font-display text-lg font-semibold text-ink">Create</p>
                <p className="text-xs text-mist">What would you like to share?</p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-2 chip text-mist hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {options.map((opt, i) => (
                <motion.button
                  key={opt.label}
                  initial={{ opacity: 0, y: 14, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.03 * i, type: "spring", stiffness: 300, damping: 22 }}
                  onClick={() => {
                    setCreateOpen(false);
                    navigate(opt.to);
                  }}
                  className="flex flex-col items-start gap-2.5 rounded-2xl glass-card p-3.5 text-left active:scale-95 transition-transform"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${opt.grad} shadow-lg`}>
                    <opt.icon className="h-5 w-5 text-white" strokeWidth={2.2} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                    <span className="block text-[11px] leading-tight text-mist">{opt.desc}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
