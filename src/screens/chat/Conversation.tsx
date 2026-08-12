import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Video, Send, Loader2, Lock, Sparkles, Languages } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { VoiceRecorder } from "../../components/VoiceRecorder";
import { VoiceMessageBubble } from "../../components/VoiceMessageBubble";
import { useAuth, type Profile } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import {
  getConversationOther,
  listMessages,
  sendMessage,
  sendVoiceMessage,
  sendEncryptedMessage,
  publishPublicKey,
  subscribeToMessages,
  type ChatMessage,
} from "../../lib/api";
import { ensureKeyPair, deriveSharedKey, encryptText, decryptText } from "../../lib/crypto";
import { suggestChatReplies, translateText, TRANSLATE_LANGUAGES } from "../../lib/ai";

async function resolveMessageText(message: ChatMessage, mine: boolean): Promise<string | null> {
  if (message.text) return message.text;
  if (!message.ciphertext || !message.iv) return null;
  try {
    const theirKeyJwk = mine ? message.recipient_public_key_jwk : message.sender_public_key_jwk;
    if (!theirKeyJwk) return null;
    const { keyPair } = await ensureKeyPair();
    const sharedKey = await deriveSharedKey(keyPair.privateKey, theirKeyJwk as unknown as JsonWebKey);
    return await decryptText(sharedKey, message.ciphertext, message.iv);
  } catch {
    return null;
  }
}

export function Conversation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startCall } = useCall();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [myPublicJwk, setMyPublicJwk] = useState<JsonWebKey | null>(null);
  const [replySuggestions, setReplySuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [translateOn, setTranslateOn] = useState(false);
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem("vyro-translate-lang") ?? "en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const encryptionReady = !!(myPublicJwk && other?.public_key_jwk);

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
    if (!user) return;
    ensureKeyPair().then(({ publicJwk, isNew }) => {
      setMyPublicJwk(publicJwk);
      if (isNew) publishPublicKey(user.id, publicJwk).catch(() => {});
    });
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !id || !user) return;
    const text = input.trim();
    setInput("");
    if (encryptionReady && other?.public_key_jwk) {
      try {
        const { keyPair } = await ensureKeyPair();
        const sharedKey = await deriveSharedKey(keyPair.privateKey, other.public_key_jwk as unknown as JsonWebKey);
        const { ciphertext, iv } = await encryptText(sharedKey, text);
        await sendEncryptedMessage(id, user.id, ciphertext, iv, myPublicJwk!, other.public_key_jwk as unknown as JsonWebKey);
        return;
      } catch {
        // encryption failed unexpectedly — fall back to plaintext rather than losing the message
      }
    }
    await sendMessage(id, user.id, text);
  };

  const handleSendVoice = async (audioUrl: string, durationSeconds: number) => {
    if (!id || !user) return;
    await sendVoiceMessage(id, user.id, audioUrl, durationSeconds);
  };

  const handleSuggestReplies = async () => {
    if (!messages || !user || suggesting) return;
    setSuggesting(true);
    setReplySuggestions(null);
    try {
      const recent = messages.filter((m) => !m.audio_url).slice(-6);
      const resolved = await Promise.all(
        recent.map(async (m) => ({ fromMe: m.sender_id === user.id, text: (await resolveMessageText(m, m.sender_id === user.id)) ?? "" }))
      );
      const { suggestions } = await suggestChatReplies(resolved.filter((r) => r.text));
      setReplySuggestions(suggestions.slice(0, 3));
    } catch {
      setReplySuggestions([]);
    } finally {
      setSuggesting(false);
    }
  };

  const handlePickLang = (code: string) => {
    setTargetLang(code);
    localStorage.setItem("vyro-translate-lang", code);
    setShowLangPicker(false);
    setTranslateOn(true);
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
          <p className="flex items-center gap-1 text-[11px] text-mist">
            {encryptionReady && <Lock className="h-2.5 w-2.5 text-emerald-400" />}
            {encryptionReady ? "End-to-end encrypted" : `@${other?.username ?? ""}`}
          </p>
        </div>
        {other && (
          <>
            <div className="relative">
              <button
                onClick={() => (translateOn ? setTranslateOn(false) : setShowLangPicker((v) => !v))}
                className={`rounded-full p-2 hover:bg-white/5 ${translateOn ? "text-cyan-300" : "text-mist"}`}
                title="Live translate"
              >
                <Languages className="h-4.5 w-4.5" />
              </button>
              {showLangPicker && (
                <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-2xl glass-strong">
                  {TRANSLATE_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handlePickLang(l.code)}
                      className="flex w-full items-center px-3.5 py-2.5 text-left text-[12.5px] text-ink hover:bg-white/5"
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              <Bubble key={m.id} message={m} mine={m.sender_id === user?.id} translateOn={translateOn} targetLang={targetLang} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(suggesting || (replySuggestions && replySuggestions.length > 0)) && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-white/5 px-3 pt-2.5">
          {suggesting ? (
            <span className="flex items-center gap-1.5 py-1.5 text-[12px] text-mist">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking of replies…
            </span>
          ) : (
            replySuggestions?.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(s);
                  setReplySuggestions(null);
                }}
                className="shrink-0 rounded-full chip px-3.5 py-1.5 text-[12px] text-ink"
              >
                {s}
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3 safe-bottom">
        {!voiceRecording && (
          <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
            />
          </div>
        )}
        {!voiceRecording && !input.trim() && messages && messages.length > 0 && (
          <button
            onClick={handleSuggestReplies}
            disabled={suggesting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full chip text-violet-300 disabled:opacity-50"
            title="Suggest replies"
          >
            <Sparkles className="h-4.5 w-4.5" />
          </button>
        )}
        {input.trim() ? (
          <button
            onClick={send}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-primary text-white transition-transform active:scale-95"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        ) : (
          <VoiceRecorder onSend={handleSendVoice} onRecordingChange={setVoiceRecording} />
        )}
      </div>
    </div>
  );
}

function Bubble({
  message,
  mine,
  translateOn,
  targetLang,
}: {
  message: ChatMessage;
  mine: boolean;
  translateOn: boolean;
  targetLang: string;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line ${
          mine ? "grad-purple-blue text-white" : "chip text-ink"
        }`}
      >
        {message.audio_url ? (
          <VoiceMessageBubble url={message.audio_url} duration={message.audio_duration_seconds ?? 0} mine={mine} />
        ) : (
          <MessageText message={message} mine={mine} translateOn={translateOn} targetLang={targetLang} />
        )}
        <div className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-mist"}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function MessageText({
  message,
  mine,
  translateOn,
  targetLang,
}: {
  message: ChatMessage;
  mine: boolean;
  translateOn: boolean;
  targetLang: string;
}) {
  const [plain, setPlain] = useState<string | null>(message.ciphertext ? null : message.text);
  const [decryptFailed, setDecryptFailed] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (!message.ciphertext) return;
    let cancelled = false;
    resolveMessageText(message, mine).then((text) => {
      if (cancelled) return;
      if (text === null) setDecryptFailed(true);
      else setPlain(text);
    });
    return () => {
      cancelled = true;
    };
  }, [message, mine]);

  useEffect(() => {
    setTranslated(null);
    setShowOriginal(false);
    if (!translateOn || mine || !plain) return;
    let cancelled = false;
    translateText(plain, targetLang)
      .then((r) => {
        if (!cancelled) setTranslated(r.translated);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [translateOn, targetLang, plain, mine]);

  if (decryptFailed) return <span className={mine ? "text-white/70" : "text-mist"}>🔒 Couldn't decrypt this message</span>;
  if (plain === null) return <span className={mine ? "text-white/70" : "text-mist"}>Decrypting…</span>;

  if (translateOn && !mine && translated) {
    return (
      <div>
        <p>{showOriginal ? plain : translated}</p>
        <button
          onClick={() => setShowOriginal((v) => !v)}
          className={`mt-0.5 text-[10px] underline ${mine ? "text-white/70" : "text-mist"}`}
        >
          {showOriginal ? "Show translation" : "Show original"}
        </button>
      </div>
    );
  }
  return <>{plain}</>;
}
