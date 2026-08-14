import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Send, Loader2, LogOut, Lock, ShieldCheck } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { VoiceRecorder } from "../../components/VoiceRecorder";
import { VoiceMessageBubble } from "../../components/VoiceMessageBubble";
import { useAuth, type Profile } from "../../context/AuthContext";
import { gradientFor } from "../../lib/gradients";
import {
  getGroup,
  leaveGroup,
  listMessages,
  sendMessage,
  sendVoiceMessage,
  sendEncryptedGroupMessage,
  publishPublicKey,
  listGroupMemberKeys,
  listGroupKeyWraps,
  insertGroupKeyWraps,
  enableGroupEncryption,
  subscribeToMessages,
  type ChatMessage,
  type Group,
} from "../../lib/api";
import { ensureKeyPair, wrapGroupKey, unwrapGroupKey, generateGroupKey, encryptText, decryptText } from "../../lib/crypto";
import { supabase } from "../../lib/supabase";

export function GroupChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map());
  const [input, setInput] = useState("");
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [myPublicJwk, setMyPublicJwk] = useState<JsonWebKey | null>(null);
  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [enabling, setEnabling] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getGroup(id).then(setGroup);
  }, [id]);

  useEffect(() => {
    if (!user) return;
    ensureKeyPair().then(({ publicJwk, isNew }) => {
      setMyPublicJwk(publicJwk);
      if (isNew) publishPublicKey(user.id, publicJwk).catch(() => {});
    });
  }, [user]);

  // Unwraps this device's copy of the group key once it exists, then grants access
  // (lazily, this device becomes the "existing holder") to any member who joined
  // encryption after they were last wrapped for.
  useEffect(() => {
    if (!group?.encrypted || !group.id || !user || !myPublicJwk) return;
    let cancelled = false;
    (async () => {
      try {
        const { keyPair } = await ensureKeyPair();
        const wraps = await listGroupKeyWraps(group.id);
        const myWrap = wraps.find((w) => w.member_id === user.id);
        if (!myWrap) return;
        const key = await unwrapGroupKey(keyPair.privateKey, myWrap.wrapper_public_key_jwk, myWrap.wrapped_key, myWrap.wrapped_iv);
        if (cancelled) return;
        setGroupKey(key);

        const members = await listGroupMemberKeys(group.id);
        const holderIds = new Set(wraps.map((w) => w.member_id));
        const missing = members.filter((m) => !holderIds.has(m.id) && m.public_key_jwk);
        if (missing.length > 0) {
          const newWraps = await Promise.all(
            missing.map(async (m) => {
              const { wrappedKey, wrappedIv } = await wrapGroupKey(keyPair.privateKey, m.public_key_jwk!, key);
              return { memberId: m.id, wrappedKey, wrappedIv, wrapperPublicJwk: myPublicJwk };
            })
          );
          await insertGroupKeyWraps(group.id, newWraps).catch(() => {});
        }
      } catch {
        // couldn't unwrap our copy yet — leave groupKey null, message bubbles show "Encrypted"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.id, group?.encrypted, user, myPublicJwk]);

  useEffect(() => {
    if (!group?.conversation_id) return;
    const convId = group.conversation_id;
    listMessages(convId).then(async (msgs) => {
      setMessages(msgs);
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      if (senderIds.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("id", senderIds);
        setAuthors(new Map((data ?? []).map((p) => [p.id, p])));
      }
    });
    const unsubscribe = subscribeToMessages(convId, (message) => {
      setMessages((prev) => (prev ? [...prev, message] : [message]));
      setAuthors((prev) => {
        if (prev.has(message.sender_id)) return prev;
        supabase
          .from("profiles")
          .select("*")
          .eq("id", message.sender_id)
          .single()
          .then(({ data }) => {
            if (data) setAuthors((p) => new Map(p).set(data.id, data));
          });
        return prev;
      });
    });
    return unsubscribe;
  }, [group?.conversation_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !group?.conversation_id || !user) return;
    const text = input.trim();
    setInput("");
    if (groupKey) {
      try {
        const { ciphertext, iv } = await encryptText(groupKey, text);
        await sendEncryptedGroupMessage(group.conversation_id, user.id, ciphertext, iv);
        return;
      } catch {
        // encryption failed unexpectedly — fall back to plaintext rather than losing the message
      }
    }
    await sendMessage(group.conversation_id, user.id, text);
  };

  const handleSendVoice = async (audioUrl: string, durationSeconds: number) => {
    if (!group?.conversation_id || !user) return;
    await sendVoiceMessage(group.conversation_id, user.id, audioUrl, durationSeconds);
  };

  const handleLeave = async () => {
    if (!id) return;
    await leaveGroup(id);
    navigate("/chat/groups", { replace: true });
  };

  const handleEnableEncryption = async () => {
    if (!group || !user || !myPublicJwk || enabling) return;
    setEnabling(true);
    try {
      const { keyPair } = await ensureKeyPair();
      const members = await listGroupMemberKeys(group.id);
      const key = await generateGroupKey();
      const wraps = await Promise.all(
        members
          .filter((m): m is typeof m & { public_key_jwk: JsonWebKey } => !!m.public_key_jwk)
          .map(async (m) => {
            const { wrappedKey, wrappedIv } = await wrapGroupKey(keyPair.privateKey, m.public_key_jwk, key);
            return { memberId: m.id, wrappedKey, wrappedIv, wrapperPublicJwk: myPublicJwk };
          })
      );
      await insertGroupKeyWraps(group.id, wraps);
      await enableGroupEncryption(group.id);
      setGroup((g) => (g ? { ...g, encrypted: true } : g));
      setGroupKey(key);
    } catch {
      // leave encryption disabled; the menu item stays available to retry
    } finally {
      setEnabling(false);
      setMenuOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial">
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-3 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 shrink-0 rounded-2xl" style={{ background: gradientFor(id ?? "group") }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{group?.name ?? "Loading…"}</p>
          <p className="flex items-center gap-1 text-[11px] text-mist">
            {group?.encrypted && <Lock className="h-2.5 w-2.5 text-emerald-400" />}
            {group ? `${group.member_count.toLocaleString()} members` : ""}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="rounded-full p-2 text-mist hover:bg-white/5">
            <MoreVertical className="h-4.5 w-4.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-2xl glass-strong">
              {group && !group.encrypted && (
                <button
                  onClick={handleEnableEncryption}
                  disabled={enabling || !myPublicJwk}
                  className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-[13px] font-medium text-emerald-400 hover:bg-white/5 disabled:opacity-50"
                >
                  {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Enable encryption
                </button>
              )}
              <button
                onClick={handleLeave}
                className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-[13px] font-medium text-rose-400 hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" /> Leave Group
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-mist">No messages yet — say hi to the group 👋</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              const author = authors.get(m.sender_id);
              if (mine) {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[75%] rounded-3xl grad-purple-blue px-4 py-2.5 text-[13.5px] leading-relaxed text-white">
                      {m.audio_url ? (
                        <VoiceMessageBubble url={m.audio_url} duration={m.audio_duration_seconds ?? 0} mine />
                      ) : (
                        <GroupMessageText message={m} groupKey={groupKey} />
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className="flex items-start gap-2.5">
                  <Avatar name={author?.name ?? "?"} avatarUrl={author?.avatar_url} size={32} />
                  <div className="max-w-[75%]">
                    <p className="mb-0.5 text-[11px] font-medium text-violet-300">{author?.name ?? "…"}</p>
                    <div className="rounded-2xl chip px-3.5 py-2.5 text-[13.5px] text-ink">
                      {m.audio_url ? (
                        <VoiceMessageBubble url={m.audio_url} duration={m.audio_duration_seconds ?? 0} mine={false} />
                      ) : (
                        <GroupMessageText message={m} groupKey={groupKey} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3 safe-bottom">
        {!voiceRecording && (
          <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Message the group..."
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
            />
          </div>
        )}
        {input.trim() ? (
          <button
            onClick={send}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-purple-blue text-white"
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

function GroupMessageText({ message, groupKey }: { message: ChatMessage; groupKey: CryptoKey | null }) {
  const [plain, setPlain] = useState<string | null>(message.ciphertext ? null : message.text);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!message.ciphertext || !message.iv || !groupKey) return;
    let cancelled = false;
    decryptText(groupKey, message.ciphertext, message.iv)
      .then((text) => {
        if (!cancelled) setPlain(text);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [message, groupKey]);

  if (failed) return <span className="opacity-70">🔒 Couldn't decrypt this message</span>;
  if (message.ciphertext && plain === null) return <span className="opacity-70">{groupKey ? "Decrypting…" : "🔒 Encrypted"}</span>;
  return <>{plain}</>;
}
