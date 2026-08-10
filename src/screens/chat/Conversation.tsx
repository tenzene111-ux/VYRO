import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Phone, Video, MoreVertical, Smile, Plus, Mic, Send, Play, Heart,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { byId, conversations, type Message } from "../../data/mock";
import { gradientFor } from "../../lib/gradients";

export function Conversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const convo = conversations.find((c) => c.id === id) ?? conversations[0];
  const user = byId(convo.userId);
  const [messages, setMessages] = useState<Message[]>(convo.messages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, from: "me", kind: "text", text: input.trim(), time: "Now", status: "sent" },
    ]);
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial">
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-3 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={user.name} size={40} online={user.online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="text-[11px] text-mist">{user.online ? "Active now" : "Offline"}</p>
        </div>
        <button
          onClick={() => navigate(`/call/voice/${user.id}`)}
          className="rounded-full p-2 text-violet-300 hover:bg-white/5"
        >
          <Phone className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={() => navigate(`/call/video/${user.id}`)}
          className="rounded-full p-2 text-cyan-300 hover:bg-white/5"
        >
          <Video className="h-4.5 w-4.5" />
        </button>
        <button className="rounded-full p-2 text-mist hover:bg-white/5">
          <MoreVertical className="h-4.5 w-4.5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full chip px-3 py-1 text-[11px] text-mist">Today</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3 safe-bottom">
        <button className="shrink-0 rounded-full p-2 text-mist hover:bg-white/5">
          <Plus className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
          <Smile className="h-4.5 w-4.5 shrink-0 text-mist" />
        </div>
        {input.trim() ? (
          <button
            onClick={send}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-primary text-white active:scale-95 transition-transform"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        ) : (
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-purple-blue text-white active:scale-95 transition-transform">
            <Mic className="h-4.5 w-4.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const mine = message.from === "me";

  if (message.kind === "image") {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className="relative w-56 overflow-hidden rounded-3xl">
          <div className="aspect-[16/10]" style={{ background: gradientFor(message.id) }} />
          <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
          </span>
        </div>
      </div>
    );
  }

  if (message.kind === "voice") {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`flex items-center gap-2.5 rounded-full px-3.5 py-2.5 ${mine ? "grad-purple-blue" : "chip"}`}>
          <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Play className="h-3.5 w-3.5 fill-white text-white" />
          </button>
          <Waveform light={mine} />
          <span className="text-[11px] text-white/85">{message.duration}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line ${
          mine ? "grad-purple-blue text-white" : "chip text-ink"
        }`}
      >
        {message.text}
        <div className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-mist"}`}>{message.time}</div>
      </div>
    </div>
  );
}

function Waveform({ light }: { light?: boolean }) {
  const bars = [4, 8, 14, 10, 18, 12, 20, 9, 15, 6, 11, 16, 7, 13, 5];
  return (
    <div className="flex h-5 items-center gap-[2.5px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full"
          style={{ height: h, background: light ? "rgba(255,255,255,0.75)" : "rgba(238,240,255,0.5)" }}
        />
      ))}
    </div>
  );
}
