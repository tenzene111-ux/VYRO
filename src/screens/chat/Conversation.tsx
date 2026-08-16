import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Video, Send, Loader2, Lock, Sparkles, Languages, Pin, X, Forward, Check, CheckCheck, Paperclip, Bookmark, BarChart3 } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { VoiceRecorder } from "../../components/VoiceRecorder";
import { VoiceMessageBubble } from "../../components/VoiceMessageBubble";
import { MessageActionSheet } from "../../components/MessageActionSheet";
import { ChatMediaBubble } from "../../components/ChatMediaBubble";
import { ChatPollBubble } from "../../components/ChatPollBubble";
import { CreatePollSheet } from "../../components/CreatePollSheet";
import { useAuth, type Profile } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import {
  getConversationOther,
  listMessages,
  listConversations,
  sendMessage,
  sendVoiceMessage,
  sendEncryptedMessage,
  sendImageMessage,
  sendVideoMessageFile,
  sendFileMessage,
  sendPollMessage,
  votePoll,
  closePoll,
  forwardMessage,
  editMessage,
  editEncryptedMessage,
  deleteMessageForEveryone,
  pinMessage,
  unpinMessage,
  toggleMessageReaction,
  markConversationRead,
  getOtherLastRead,
  publishPublicKey,
  subscribeToMessages,
  subscribeToMessageUpdates,
  subscribeToReactions,
  subscribeToReadReceipts,
  subscribeToPollVotes,
  createTypingChannel,
  messagePreviewText,
  type ChatConversation,
  type ChatMessage,
} from "../../lib/api";
import { ensureKeyPair, deriveSharedKey, encryptText, decryptText } from "../../lib/crypto";
import { suggestChatReplies, translateText, TRANSLATE_LANGUAGES } from "../../lib/ai";
import { loadHiddenMessages, hideMessageLocally } from "../../lib/chatLocal";
import { uploadChatFile } from "../../lib/storage";

const TYPING_IDLE_MS = 3000;

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
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [myPublicJwk, setMyPublicJwk] = useState<JsonWebKey | null>(null);
  const [replySuggestions, setReplySuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [translateOn, setTranslateOn] = useState(false);
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem("vyro-translate-lang") ?? "en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [forwardMessageTarget, setForwardMessageTarget] = useState<ChatMessage | null>(null);
  const [forwardConversations, setForwardConversations] = useState<ChatConversation[] | null>(null);
  const [pollComposerOpen, setPollComposerOpen] = useState(false);
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof createTypingChannel> | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  const isSelf = !!other && other.id === user?.id;
  const encryptionReady = !isSelf && !!(myPublicJwk && other?.public_key_jwk);
  const pinnedMessage = messages?.find((m) => m.pinned && !m.deleted_at) ?? null;
  const visibleMessages = (messages ?? []).filter((m) => !hidden.has(m.id));

  useEffect(() => {
    if (!user) return;
    setHidden(loadHiddenMessages(user.id));
  }, [user]);

  useEffect(() => {
    if (!id || !user) return;
    getConversationOther(id, user.id).then(setOther);
    listMessages(id).then(setMessages);
    getOtherLastRead(id, user.id).then(() => {});
    markConversationRead(id, user.id).catch(() => {});

    const unsubscribeInsert = subscribeToMessages(id, (message) => {
      setMessages((prev) => (prev ? [...prev, message] : [message]));
      markConversationRead(id, user.id).catch(() => {});
    });
    const unsubscribeUpdate = subscribeToMessageUpdates(id, (updated) => {
      setMessages((prev) => (prev ? prev.map((m) => (m.id === updated.id ? { ...updated, reactions: m.reactions, poll: m.poll } : m)) : prev));
    });
    const unsubscribeReactions = subscribeToReactions(id, () => {
      listMessages(id).then(setMessages);
    });
    const unsubscribeReads = subscribeToReadReceipts(id, () => {
      getConversationOther(id, user.id).then((o) => {
        if (o) getOtherLastRead(id, o.id).then(setOtherLastRead);
      });
    });
    const unsubscribePolls = subscribeToPollVotes(id, () => {
      listMessages(id).then(setMessages);
    });

    return () => {
      unsubscribeInsert();
      unsubscribeUpdate();
      unsubscribeReactions();
      unsubscribeReads();
      unsubscribePolls();
    };
  }, [id, user]);

  useEffect(() => {
    if (!id || !other) return;
    getOtherLastRead(id, other.id).then(setOtherLastRead);
  }, [id, other]);

  useEffect(() => {
    if (!id || !user) return;
    typingChannelRef.current = createTypingChannel(id, (userId) => {
      if (userId === user.id) return;
      setOtherTyping(true);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      typingClearRef.current = setTimeout(() => setOtherTyping(false), TYPING_IDLE_MS);
    });
    return () => {
      typingChannelRef.current?.unsubscribe();
      typingChannelRef.current = null;
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
    };
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
  }, [visibleMessages.length]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!id || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      typingChannelRef.current?.sendTyping(user.id);
    }
  };

  const send = async () => {
    if (!input.trim() || !id || !user) return;
    const text = input.trim();

    if (editingMessage) {
      setInput("");
      const target = editingMessage;
      setEditingMessage(null);
      if (target.ciphertext && other?.public_key_jwk) {
        try {
          const { keyPair } = await ensureKeyPair();
          const sharedKey = await deriveSharedKey(keyPair.privateKey, other.public_key_jwk as unknown as JsonWebKey);
          const { ciphertext, iv } = await encryptText(sharedKey, text);
          await editEncryptedMessage(target.id, ciphertext, iv);
        } catch {
          // leave the original message untouched if re-encryption failed
        }
      } else {
        await editMessage(target.id, text);
      }
      setMessages((prev) =>
        prev ? prev.map((m) => (m.id === target.id ? { ...m, text: target.ciphertext ? m.text : text, edited_at: new Date().toISOString() } : m)) : prev
      );
      return;
    }

    setInput("");
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    if (encryptionReady && other?.public_key_jwk) {
      try {
        const { keyPair } = await ensureKeyPair();
        const sharedKey = await deriveSharedKey(keyPair.privateKey, other.public_key_jwk as unknown as JsonWebKey);
        const { ciphertext, iv } = await encryptText(sharedKey, text);
        await sendEncryptedMessage(id, user.id, ciphertext, iv, myPublicJwk!, other.public_key_jwk as unknown as JsonWebKey, replyToId);
        return;
      } catch {
        // encryption failed unexpectedly — fall back to plaintext rather than losing the message
      }
    }
    await sendMessage(id, user.id, text, replyToId);
  };

  const handleSendVoice = async (audioUrl: string, durationSeconds: number) => {
    if (!id || !user) return;
    await sendVoiceMessage(id, user.id, audioUrl, durationSeconds, replyingTo?.id);
    setReplyingTo(null);
  };

  const handleCreatePoll = async (question: string, options: string[], allowMultiple: boolean) => {
    if (!id || !user) return;
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    await sendPollMessage(id, user.id, question, options, allowMultiple, replyToId);
  };

  const handleVote = async (message: ChatMessage, optionIds: string[]) => {
    if (!user || !message.poll) return;
    const poll = message.poll;
    setMessages((prev) =>
      prev
        ? prev.map((m) =>
            m.id === message.id && m.poll
              ? { ...m, poll: { ...m.poll, votes: [...m.poll.votes.filter((v) => v.user_id !== user.id), ...optionIds.map((option_id) => ({ option_id, user_id: user.id }))] } }
              : m
          )
        : prev
    );
    try {
      await votePoll(poll.id, optionIds);
    } catch {
      if (id) listMessages(id).then(setMessages);
    }
  };

  const handleClosePoll = async (message: ChatMessage) => {
    if (!message.poll) return;
    const pollId = message.poll.id;
    setMessages((prev) =>
      prev ? prev.map((m) => (m.id === message.id && m.poll ? { ...m, poll: { ...m.poll, closed: true } } : m)) : prev
    );
    try {
      await closePoll(pollId);
    } catch {
      if (id) listMessages(id).then(setMessages);
    }
  };

  const handleAttach = async (file: File) => {
    if (!id || !user || uploading) return;
    setUploading(true);
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    try {
      const url = await uploadChatFile(user.id, file);
      if (file.type.startsWith("image/")) await sendImageMessage(id, user.id, url, replyToId);
      else if (file.type.startsWith("video/")) await sendVideoMessageFile(id, user.id, url, replyToId);
      else await sendFileMessage(id, user.id, url, file.name, file.size, replyToId);
    } catch {
      // upload failed — nothing was sent, no partial message left behind
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  const handleReact = async (message: ChatMessage, emoji: string) => {
    if (!user || !id) return;
    const current = message.reactions.find((r) => r.user_id === user.id)?.emoji ?? null;
    const next = current === emoji ? null : emoji;
    setMessages((prev) =>
      prev
        ? prev.map((m) =>
            m.id === message.id
              ? { ...m, reactions: [...m.reactions.filter((r) => r.user_id !== user.id), ...(next ? [{ user_id: user.id, emoji: next }] : [])] }
              : m
          )
        : prev
    );
    try {
      await toggleMessageReaction(message.id, id, user.id, next, current);
    } catch {
      listMessages(id).then(setMessages);
    }
  };

  const handleCopy = async (message: ChatMessage) => {
    const text = await resolveMessageText(message, message.sender_id === user?.id);
    if (text) await navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleEdit = async (message: ChatMessage) => {
    const text = await resolveMessageText(message, true);
    if (text === null) return;
    setEditingMessage(message);
    setReplyingTo(null);
    setInput(text);
  };

  const handleDeleteForMe = (message: ChatMessage) => {
    if (!user) return;
    setHidden((prev) => hideMessageLocally(user.id, message.id, prev));
  };

  const handleDeleteForEveryone = async (message: ChatMessage) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    setMessages((prev) => (prev ? prev.map((m) => (m.id === message.id ? { ...m, text: null, ciphertext: null, audio_url: null, deleted_at: new Date().toISOString() } : m)) : prev));
    try {
      await deleteMessageForEveryone(message.id);
    } catch {
      listMessages(id!).then(setMessages);
    }
  };

  const handlePin = async (message: ChatMessage) => {
    if (!id) return;
    setMessages((prev) => (prev ? prev.map((m) => ({ ...m, pinned: m.id === message.id })) : prev));
    try {
      await pinMessage(id, message.id);
    } catch {
      listMessages(id).then(setMessages);
    }
  };

  const handleUnpin = async (message: ChatMessage) => {
    setMessages((prev) => (prev ? prev.map((m) => (m.id === message.id ? { ...m, pinned: false } : m)) : prev));
    try {
      await unpinMessage(message.id);
    } catch {
      listMessages(id!).then(setMessages);
    }
  };

  const handleOpenForward = (message: ChatMessage) => {
    setForwardMessageTarget(message);
    if (!forwardConversations && user) listConversations(user.id).then(setForwardConversations);
  };

  const handleForwardTo = async (destConversationId: string) => {
    if (!user || !forwardMessageTarget) return;
    const text = await resolveMessageText(forwardMessageTarget, forwardMessageTarget.sender_id === user.id);
    setForwardMessageTarget(null);
    if (!text) return;
    await forwardMessage(destConversationId, user.id, text);
  };

  const scrollToMessage = (messageId: string) => {
    document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial">
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-3 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isSelf ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-purple-blue">
            <Bookmark className="h-4.5 w-4.5 text-white" fill="currentColor" />
          </div>
        ) : (
          <Avatar name={other?.name ?? "…"} avatarUrl={other?.avatar_url} size={40} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{isSelf ? "Saved Messages" : other?.name ?? "Loading…"}</p>
          <p className="flex items-center gap-1 text-[11px] text-mist">
            {isSelf ? (
              "Notes, links and messages to yourself"
            ) : otherTyping ? (
              <span className="text-cyan-300">typing…</span>
            ) : (
              <>
                {encryptionReady && <Lock className="h-2.5 w-2.5 text-emerald-400" />}
                {encryptionReady ? "End-to-end encrypted" : `@${other?.username ?? ""}`}
              </>
            )}
          </p>
        </div>
        {other && !isSelf && (
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

      {pinnedMessage && (
        <button
          onClick={() => scrollToMessage(pinnedMessage.id)}
          className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-3.5 py-2 text-left"
        >
          <Pin className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-ink/80">{messagePreviewText(pinnedMessage)}</span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : visibleMessages.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-mist">Say hello 👋</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visibleMessages.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                mine={m.sender_id === user?.id}
                userId={user?.id ?? ""}
                translateOn={translateOn}
                targetLang={targetLang}
                allMessages={messages}
                read={m.sender_id === user?.id && !!otherLastRead && new Date(m.created_at) <= new Date(otherLastRead)}
                onOpenActions={() => setActionMessage(m)}
                onJumpToReply={scrollToMessage}
                onVote={(optionIds) => handleVote(m, optionIds)}
                onClosePoll={() => handleClosePoll(m)}
              />
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

      {(replyingTo || editingMessage) && (
        <div className="flex items-center justify-between gap-2 border-t border-white/5 px-3.5 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-cyan-400 pl-2.5">
            <p className="text-[11px] font-semibold text-cyan-300">{editingMessage ? "Editing message" : `Replying to ${replyingTo?.sender_id === user?.id ? "yourself" : other?.name ?? ""}`}</p>
            <p className="truncate text-[12px] text-mist">{messagePreviewText((editingMessage ?? replyingTo)!)}</p>
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
              if (editingMessage) {
                setEditingMessage(null);
                setInput("");
              }
            }}
            className="shrink-0 rounded-full p-1.5 text-mist hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3 safe-bottom">
        {!voiceRecording && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAttach(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full chip text-mist disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Paperclip className="h-4.5 w-4.5" />}
            </button>
            {!isSelf && (
              <button
                onClick={() => setPollComposerOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full chip text-mist"
                title="Create a poll"
              >
                <BarChart3 className="h-4.5 w-4.5" />
              </button>
            )}
            <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2.5">
              <input
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
              />
            </div>
          </>
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
            {editingMessage ? <Check className="h-4.5 w-4.5" /> : <Send className="h-4.5 w-4.5" />}
          </button>
        ) : (
          <VoiceRecorder onSend={handleSendVoice} onRecordingChange={setVoiceRecording} />
        )}
      </div>

      {actionMessage && (
        <MessageActionSheet
          message={actionMessage}
          mine={actionMessage.sender_id === user?.id}
          onClose={() => setActionMessage(null)}
          onReply={() => setReplyingTo(actionMessage)}
          onReact={(emoji) => handleReact(actionMessage, emoji)}
          onCopy={() => handleCopy(actionMessage)}
          onEdit={() => handleEdit(actionMessage)}
          onDeleteForMe={() => handleDeleteForMe(actionMessage)}
          onDeleteForEveryone={() => handleDeleteForEveryone(actionMessage)}
          onPin={() => handlePin(actionMessage)}
          onUnpin={() => handleUnpin(actionMessage)}
          onForward={() => handleOpenForward(actionMessage)}
        />
      )}

      {pollComposerOpen && <CreatePollSheet onClose={() => setPollComposerOpen(false)} onCreate={handleCreatePoll} />}

      {forwardMessageTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setForwardMessageTarget(null)} />
          <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-h-[60vh] max-w-[440px] overflow-y-auto rounded-3xl glass-strong p-3">
            <p className="mb-2 px-1.5 py-1 text-[13px] font-semibold text-ink">Forward to…</p>
            {forwardConversations === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-mist" />
              </div>
            ) : (
              forwardConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleForwardTo(c.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
                >
                  {c.is_self ? (
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full grad-purple-blue">
                      <Bookmark className="h-4 w-4 text-white" fill="currentColor" />
                    </div>
                  ) : (
                    <Avatar name={c.other.name} avatarUrl={c.other.avatar_url} size={38} />
                  )}
                  <span className="truncate text-[13.5px] font-medium text-ink">{c.is_self ? "Saved Messages" : c.other.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Bubble({
  message,
  mine,
  userId,
  translateOn,
  targetLang,
  allMessages,
  read,
  onOpenActions,
  onJumpToReply,
  onVote,
  onClosePoll,
}: {
  message: ChatMessage;
  mine: boolean;
  userId: string;
  translateOn: boolean;
  targetLang: string;
  allMessages: ChatMessage[];
  read: boolean;
  onOpenActions: () => void;
  onJumpToReply: (id: string) => void;
  onVote: (optionIds: string[]) => void;
  onClosePoll: () => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = () => {
    pressTimer.current = setTimeout(onOpenActions, 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  const repliedTo = message.reply_to_id ? allMessages.find((m) => m.id === message.reply_to_id) : null;

  const reactionCounts = new Map<string, number>();
  for (const r of message.reactions) reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) ?? 0) + 1);

  return (
    <div id={`msg-${message.id}`} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        className={`max-w-[75%] select-none rounded-3xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line ${
          mine ? "grad-purple-blue text-white" : "chip text-ink"
        }`}
      >
        {message.forwarded && (
          <p className={`mb-1 flex items-center gap-1 text-[10.5px] font-semibold ${mine ? "text-white/70" : "text-mist"}`}>
            <Forward className="h-3 w-3" /> Forwarded
          </p>
        )}
        {repliedTo && (
          <button
            onClick={() => onJumpToReply(repliedTo.id)}
            className={`mb-1.5 block w-full truncate rounded-xl border-l-2 px-2 py-1 text-left text-[11.5px] ${
              mine ? "border-white/50 bg-white/10 text-white/80" : "border-cyan-400 bg-white/5 text-mist"
            }`}
          >
            {messagePreviewText(repliedTo)}
          </button>
        )}
        {message.deleted_at ? (
          <span className={`italic ${mine ? "text-white/60" : "text-mist"}`}>This message was deleted</span>
        ) : message.poll ? (
          <ChatPollBubble poll={message.poll} mine={mine} userId={userId} onVote={onVote} onClose={onClosePoll} />
        ) : message.image_url || message.video_url || message.file_url ? (
          <ChatMediaBubble message={message} mine={mine} />
        ) : message.audio_url ? (
          <VoiceMessageBubble url={message.audio_url} duration={message.audio_duration_seconds ?? 0} mine={mine} />
        ) : (
          <MessageText message={message} mine={mine} translateOn={translateOn} targetLang={targetLang} />
        )}
        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-white/70" : "text-mist"}`}>
          {message.edited_at && !message.deleted_at && <span>edited ·</span>}
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {mine && (read ? <CheckCheck className="h-3.5 w-3.5 text-cyan-300" /> : <Check className="h-3.5 w-3.5" />)}
        </div>
      </div>
      {reactionCounts.size > 0 && (
        <div className="mt-1 flex gap-1">
          {[...reactionCounts.entries()].map(([emoji, count]) => (
            <span key={emoji} className="rounded-full chip px-1.5 py-0.5 text-[11px]">
              {emoji} {count > 1 && count}
            </span>
          ))}
        </div>
      )}
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
