import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Video, MoreVertical, Smile, Plus, Mic, Send } from "lucide-react";
import { groups, users } from "../../data/mock";
import { gradientFor } from "../../lib/gradients";
import { Avatar } from "../../components/Avatar";

export function GroupChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const group = groups.find((g) => g.id === id) ?? groups[0];
  const members = users.slice(1, 5);
  const [input, setInput] = useState("");

  const seed = [
    { user: members[0], text: "Just posted new sunrise shots from Punakha 📸" },
    { user: members[1], text: "These are incredible! Which lens?" },
    { user: members[0], text: "24-70mm, golden hour magic ✨" },
  ];

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial">
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-3 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 shrink-0 rounded-2xl" style={{ background: gradientFor(group.id) }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{group.name}</p>
          <p className="text-[11px] text-mist">{group.members.toLocaleString()} members</p>
        </div>
        <button onClick={() => navigate(`/call/voice/u1`)} className="rounded-full p-2 text-violet-300 hover:bg-white/5">
          <Phone className="h-4.5 w-4.5" />
        </button>
        <button onClick={() => navigate(`/call/video/u1`)} className="rounded-full p-2 text-cyan-300 hover:bg-white/5">
          <Video className="h-4.5 w-4.5" />
        </button>
        <button className="rounded-full p-2 text-mist hover:bg-white/5">
          <MoreVertical className="h-4.5 w-4.5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-3">
          {seed.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Avatar name={s.user.name} size={32} />
              <div className="max-w-[75%]">
                <p className="mb-0.5 text-[11px] font-medium text-violet-300">{s.user.name}</p>
                <div className="rounded-2xl chip px-3.5 py-2.5 text-[13.5px] text-ink">{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3 safe-bottom">
        <button className="shrink-0 rounded-full p-2 text-mist hover:bg-white/5">
          <Plus className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the group..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
          <Smile className="h-4.5 w-4.5 shrink-0 text-mist" />
        </div>
        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-purple-blue text-white">
          {input.trim() ? <Send className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
        </button>
      </div>
    </div>
  );
}
