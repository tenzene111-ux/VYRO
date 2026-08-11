import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Video, Send, Loader2 } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { useAuth, type Profile } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import { getConversationOther, listMessages, sendMessage, subscribeToMessages, type ChatMessage } from "../../lib/api";

export function Conversation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startCall } = useCall();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    getConversationOther(id, user.id).then(setOther);
    listMessages(id).then(setMessages);
    const unsubscribe = subscribeToMessages(id, (message) => {
      setMessages((prev) => (prev ? [...prev, message] : [message]));
    });
    return unsubscribe;
  }, [id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !id || !user) return;
    const text = input.trim();
    setInput("");
    await sendMessage(id, user.id, text);
  };

  const handleCall = async (kind: "voice" | "video") => {
    if (!other) return;
    await startCall(other.id, other.name, kind);
    navigate(`/call/${kind}/${other.id}`, { state: { name: other.name } });
  };

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial">
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-3 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={other?.name ?? "…"} avatarUrl={other?.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{other?.name ?? "Loading…"}</p>
          <p className="text-[11px] text-mist">@{other?.username ?? ""}</p>
        </div>
        {other && (
          <>
            <button onClick={() => handleCall("voice")} className="rounded-full p-2 text-violet-300 hover:bg-white/5">
              <Phone className="h-4.5 w-4.5" />
            </button>
            <button onClick={() => handleCall("video")} className="rounded-full p-2 text-cyan-300 hover:bg-white/5">
              <Video className="h-4.5 w-4.5" />
            </button>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-mist">Say hello 👋</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} mine={m.sender_id === user?.id} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3 safe-bottom">
        <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </div>
        <button
          onClick={send}
          disabled={!input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-primary text-white transition-transform active:scale-95 disabled:opacity-40"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line ${
          mine ? "grad-purple-blue text-white" : "chip text-ink"
        }`}
      >
        {message.text}
        <div className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-mist"}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
