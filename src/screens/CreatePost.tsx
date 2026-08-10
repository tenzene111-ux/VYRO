import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Image, UserPlus, Smile, MapPin, BarChart2, Sticker, Music2, Sparkles, Radio, ChevronDown } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { currentUser } from "../data/mock";

const options = [
  { label: "Photo/Video", icon: Image, color: "text-emerald-400" },
  { label: "Tag People", icon: UserPlus, color: "text-blue-400" },
  { label: "Feeling/Activity", icon: Smile, color: "text-amber-400" },
  { label: "Check In", icon: MapPin, color: "text-fuchsia-400" },
  { label: "Poll", icon: BarChart2, color: "text-cyan-400" },
  { label: "GIF", icon: Sticker, color: "text-pink-400" },
  { label: "Music", icon: Music2, color: "text-violet-400" },
  { label: "AI Assist", icon: Sparkles, color: "text-yellow-300" },
  { label: "Live Video", icon: Radio, color: "text-red-400" },
];

export function CreatePost() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [privacy, setPrivacy] = useState("Public");
  const [active, setActive] = useState<string[]>([]);

  const toggle = (label: string) =>
    setActive((a) => (a.includes(label) ? a.filter((x) => x !== label) : [...a, label]));

  return (
    <div className="flex min-h-svh flex-col bg-vyro-radial safe-top">
      <header className="flex items-center justify-between px-4 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <X className="h-4.5 w-4.5" />
        </button>
        <p className="font-display text-base font-semibold text-ink">Create Post</p>
        <button
          disabled={!text.trim() && active.length === 0}
          onClick={() => navigate("/home")}
          className="rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Post
        </button>
      </header>

      <div className="flex items-center gap-3 px-4 pb-3">
        <Avatar name={currentUser.name} size={42} />
        <div>
          <p className="text-sm font-semibold text-ink">{currentUser.name}</p>
          <button
            onClick={() => setPrivacy(privacy === "Public" ? "Friends" : privacy === "Friends" ? "Private" : "Public")}
            className="mt-0.5 flex items-center gap-1 rounded-full chip px-2.5 py-1 text-[11px] font-medium text-ink"
          >
            <UserPlus className="h-3 w-3" />
            {privacy}
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind?"
        rows={5}
        className="mx-4 flex-1 resize-none bg-transparent text-[15px] text-ink placeholder:text-mist/70 focus:outline-none"
      />

      {active.length > 0 && (
        <div className="mx-4 mb-3 flex flex-wrap gap-2">
          {active.map((a) => (
            <span key={a} onClick={() => toggle(a)} className="cursor-pointer rounded-full chip px-3 py-1 text-[11px] text-cyan-300">
              {a} ✕
            </span>
          ))}
        </div>
      )}

      <div className="mx-4 mb-6 grid grid-cols-2 gap-2.5 rounded-2xl glass-card p-2.5">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => toggle(o.label)}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
              active.includes(o.label) ? "bg-white/8 text-ink" : "text-ink/85 hover:bg-white/5"
            }`}
          >
            <o.icon className={`h-4.5 w-4.5 ${o.color}`} />
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
