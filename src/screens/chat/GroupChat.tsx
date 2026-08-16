import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, MoreVertical, Send, Loader2, LogOut, Lock, ShieldCheck, Pin, X, Check, Forward, Paperclip, Info, Bookmark, Plus, Sticker } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { VoiceRecorder } from "../../components/VoiceRecorder";
import { VoiceMessageBubble } from "../../components/VoiceMessageBubble";
import { MessageActionSheet } from "../../components/MessageActionSheet";
import { ChatMediaBubble } from "../../components/ChatMediaBubble";
import { ChatPollBubble } from "../../components/ChatPollBubble";
import { CreatePollSheet } from "../../components/CreatePollSheet";
import { ChatLocationBubble } from "../../components/ChatLocationBubble";
import { ChatContactBubble } from "../../components/ChatContactBubble";
import { ContactPickerSheet } from "../../components/ContactPickerSheet";
import { AttachMenu } from "../../components/AttachMenu";
import { StickerPicker } from "../../components/StickerPicker";
import { CreateTopicSheet } from "../../components/CreateTopicSheet";
import { useAuth, type Profile } from "../../context/AuthContext";
import { gradientFor } from "../../lib/gradients";
import { useIsDesktop } from "../../lib/useIsDesktop";
import {
  getGroup,
  getMyGroupRole,
  leaveGroup,
  listMessages,
  listConversations,
  sendMessage,
  sendVoiceMessage,
  sendImageMessage,
  sendVideoMessageFile,
  sendFileMessage,
  sendPollMessage,
  sendLocationMessage,
  sendContactMessage,
  sendStickerMessage,
  votePoll,
  closePoll,
  sendEncryptedGroupMessage,
  forwardMessage,
  editMessage,
  editEncryptedMessage,
  deleteMessageForEveryone,
  adminDeleteGroupMessage,
  pinMessage,
  unpinMessage,
  toggleMessageReaction,
  markConversationRead,
  listReadPointers,
  publishPublicKey,
  listGroupMemberKeys,
  listGroupKeyWraps,
  insertGroupKeyWraps,
  enableGroupEncryption,
  subscribeToMessages,
  subscribeToMessageUpdates,
  subscribeToReactions,
  subscribeToReadReceipts,
  subscribeToPollVotes,
  createTypingChannel,
  messagePreviewText,
  listGroupTopics,
  createGroupTopic,
  type ChatConversation,
  type ChatMessage,
  type Group,
  type GroupTopic,
} from "../../lib/api";
import { ensureKeyPair, wrapGroupKey, unwrapGroupKey, generateGroupKey, encryptText, decryptText } from "../../lib/crypto";
import { supabase } from "../../lib/supabase";
import { loadHiddenMessages, hideMessageLocally } from "../../lib/chatLocal";
import { uploadChatFile } from "../../lib/storage";

const TYPING_IDLE_MS = 3000;

async function resolveGroupMessageText(message: ChatMessage, groupKey: CryptoKey | null): Promise<string | null> {
  if (message.text) return message.text;
  if (!message.ciphertext || !message.iv || !groupKey) return null;
  try {
    return await decryptText(groupKey, message.ciphertext, message.iv);
  } catch {
    return null;
  }
}

export function GroupChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const [group, setGroup] = useState<Group | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [myPublicJwk, setMyPublicJwk] = useState<JsonWebKey | null>(null);
  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [forwardMessageTarget, setForwardMessageTarget] = useState<ChatMessage | null>(null);
  const [forwardConversations, setForwardConversations] = useState<ChatConversation[] | null>(null);
  const [pollComposerOpen, setPollComposerOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [topics, setTopics] = useState<GroupTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  const [readPointers, setReadPointers] = useState<{ user_id: string; last_read_at: string }[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof createTypingChannel> | null>(null);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastTypingSentRef = useRef(0);

  const pinnedMessage = messages?.find((m) => m.pinned && !m.deleted_at) ?? null;
  const visibleMessages = (messages ?? []).filter((m) => !hidden.has(m.id));
  // undefined = this group has no topics, so every send/list call is
  // topic-agnostic exactly as before this feature existed
  const topicFilterId = topics.length > 0 ? activeTopic : undefined;
  const canManageTopics = myRole === "owner" || myRole === "admin";

  useEffect(() => {
    if (!user) return;
    setHidden(loadHiddenMessages(user.id));
  }, [user]);

  useEffect(() => {
    if (!id) return;
    getGroup(id).then(setGroup);
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    getMyGroupRole(id, user.id).then(setMyRole);
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    listGroupTopics(id).then(setTopics).catch(() => setTopics([]));
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
    if (!group?.conversation_id || !user) return;
    const convId = group.conversation_id;
    setMessages(null);
    listMessages(convId, topicFilterId).then(async (msgs) => {
      setMessages(msgs);
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      if (senderIds.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("id", senderIds);
        setAuthors(new Map((data ?? []).map((p) => [p.id, p])));
      }
    });
    listReadPointers(convId).then(setReadPointers);
    markConversationRead(convId, user.id).catch(() => {});

    const unsubscribeInsert = subscribeToMessages(convId, (message) => {
      // the realtime channel delivers every message in the conversation
      // regardless of topic, so the currently-open topic filters here
      if (topicFilterId !== undefined && message.topic_id !== topicFilterId) return;
      setMessages((prev) => (prev ? [...prev, message] : [message]));
      markConversationRead(convId, user.id).catch(() => {});
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
    const unsubscribeUpdate = subscribeToMessageUpdates(convId, (updated) => {
      setMessages((prev) =>
        prev ? prev.map((m) => (m.id === updated.id ? { ...updated, reactions: m.reactions, poll: m.poll, sharedProfile: m.sharedProfile } : m)) : prev
      );
    });
    const unsubscribeReactions = subscribeToReactions(convId, () => {
      listMessages(convId, topicFilterId).then(setMessages);
    });
    const unsubscribeReads = subscribeToReadReceipts(convId, () => {
      listReadPointers(convId).then(setReadPointers);
    });
    const unsubscribePolls = subscribeToPollVotes(convId, () => {
      listMessages(convId, topicFilterId).then(setMessages);
    });

    return () => {
      unsubscribeInsert();
      unsubscribeUpdate();
      unsubscribeReactions();
      unsubscribeReads();
      unsubscribePolls();
    };
  }, [group?.conversation_id, user, topicFilterId]);

  useEffect(() => {
    if (!group?.conversation_id || !user) return;
    const convId = group.conversation_id;
    typingChannelRef.current = createTypingChannel(convId, (userId) => {
      if (userId === user.id) return;
      setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      const timers = typingTimersRef.current;
      const existing = timers.get(userId);
      if (existing) clearTimeout(existing);
      timers.set(
        userId,
        setTimeout(() => {
          setTypingUserIds((prev) => prev.filter((u) => u !== userId));
          timers.delete(userId);
        }, TYPING_IDLE_MS)
      );
    });
    return () => {
      typingChannelRef.current?.unsubscribe();
      typingChannelRef.current = null;
      typingTimersRef.current.forEach((t) => clearTimeout(t));
      typingTimersRef.current.clear();
    };
  }, [group?.conversation_id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length]);

  useEffect(() => {
    const targetId = (location.state as { scrollToMessageId?: string } | null)?.scrollToMessageId;
    if (!targetId || !messages?.some((m) => m.id === targetId)) return;
    const timer = setTimeout(() => {
      document.getElementById(`gmsg-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    navigate(location.pathname, { replace: true, state: {} });
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!group?.conversation_id || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      typingChannelRef.current?.sendTyping(user.id);
    }
  };

  const send = async () => {
    if (!input.trim() || !group?.conversation_id || !user) return;
    const text = input.trim();
    const convId = group.conversation_id;

    if (editingMessage) {
      setInput("");
      const target = editingMessage;
      setEditingMessage(null);
      if (target.ciphertext && groupKey) {
        try {
          const { ciphertext, iv } = await encryptText(groupKey, text);
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
    const topicId = topicFilterId;
    if (groupKey) {
      try {
        const { ciphertext, iv } = await encryptText(groupKey, text);
        await sendEncryptedGroupMessage(convId, user.id, ciphertext, iv, replyToId, topicId);
        return;
      } catch {
        // encryption failed unexpectedly — fall back to plaintext rather than losing the message
      }
    }
    await sendMessage(convId, user.id, text, replyToId, topicId);
  };

  const handleSendVoice = async (audioUrl: string, durationSeconds: number) => {
    if (!group?.conversation_id || !user) return;
    await sendVoiceMessage(group.conversation_id, user.id, audioUrl, durationSeconds, replyingTo?.id, topicFilterId);
    setReplyingTo(null);
  };

  const handleCreatePoll = async (question: string, options: string[], allowMultiple: boolean) => {
    if (!group?.conversation_id || !user) return;
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    await sendPollMessage(group.conversation_id, user.id, question, options, allowMultiple, replyToId, topicFilterId);
  };

  const handleSendLocation = () => {
    if (!group?.conversation_id || !user || !navigator.geolocation) return;
    const convId = group.conversation_id;
    const replyToId = replyingTo?.id;
    const topicId = topicFilterId;
    setReplyingTo(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocationMessage(convId, user.id, pos.coords.latitude, pos.coords.longitude, undefined, replyToId, topicId).catch(() => {});
      },
      () => {
        // location permission denied or unavailable — nothing sent, no partial message left behind
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleShareContact = async (contact: Profile) => {
    setContactPickerOpen(false);
    if (!group?.conversation_id || !user) return;
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    await sendContactMessage(group.conversation_id, user.id, contact.id, replyToId, topicFilterId);
  };

  const handleSendSticker = async (emoji: string) => {
    if (!group?.conversation_id || !user) return;
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    await sendStickerMessage(group.conversation_id, user.id, emoji, replyToId, topicFilterId);
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
      if (group?.conversation_id) listMessages(group.conversation_id, topicFilterId).then(setMessages);
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
      if (group?.conversation_id) listMessages(group.conversation_id, topicFilterId).then(setMessages);
    }
  };

  const handleAttach = async (file: File) => {
    if (!group?.conversation_id || !user || uploading) return;
    const convId = group.conversation_id;
    setUploading(true);
    const replyToId = replyingTo?.id;
    const topicId = topicFilterId;
    setReplyingTo(null);
    try {
      const url = await uploadChatFile(user.id, file);
      if (file.type.startsWith("image/")) await sendImageMessage(convId, user.id, url, replyToId, topicId);
      else if (file.type.startsWith("video/")) await sendVideoMessageFile(convId, user.id, url, replyToId, topicId);
      else await sendFileMessage(convId, user.id, url, file.name, file.size, replyToId, topicId);
    } catch {
      // upload failed — nothing was sent, no partial message left behind
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  const handleReact = async (message: ChatMessage, emoji: string) => {
    if (!user || !group?.conversation_id) return;
    const convId = group.conversation_id;
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
      await toggleMessageReaction(message.id, convId, user.id, next, current);
    } catch {
      listMessages(convId, topicFilterId).then(setMessages);
    }
  };

  const handleCopy = async (message: ChatMessage) => {
    const text = await resolveGroupMessageText(message, groupKey);
    if (text) await navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleEdit = async (message: ChatMessage) => {
    const text = await resolveGroupMessageText(message, groupKey);
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
    const mine = message.sender_id === user?.id;
    setMessages((prev) => (prev ? prev.map((m) => (m.id === message.id ? { ...m, text: null, ciphertext: null, audio_url: null, deleted_at: new Date().toISOString() } : m)) : prev));
    try {
      if (mine) await deleteMessageForEveryone(message.id);
      else await adminDeleteGroupMessage(message.id);
    } catch {
      if (group?.conversation_id) listMessages(group.conversation_id, topicFilterId).then(setMessages);
    }
  };

  const handlePin = async (message: ChatMessage) => {
    if (!group?.conversation_id) return;
    const convId = group.conversation_id;
    setMessages((prev) => (prev ? prev.map((m) => ({ ...m, pinned: m.id === message.id })) : prev));
    try {
      await pinMessage(convId, message.id);
    } catch {
      listMessages(convId, topicFilterId).then(setMessages);
    }
  };

  const handleUnpin = async (message: ChatMessage) => {
    setMessages((prev) => (prev ? prev.map((m) => (m.id === message.id ? { ...m, pinned: false } : m)) : prev));
    try {
      await unpinMessage(message.id);
    } catch {
      if (group?.conversation_id) listMessages(group.conversation_id, topicFilterId).then(setMessages);
    }
  };

  const handleCreateTopic = async (name: string, icon: string) => {
    if (!id || !user) return;
    const newTopicId = await createGroupTopic(id, user.id, name, icon);
    await listGroupTopics(id).then(setTopics);
    setActiveTopic(newTopicId);
  };

  const handleOpenForward = (message: ChatMessage) => {
    setForwardMessageTarget(message);
    if (!forwardConversations && user) listConversations(user.id).then(setForwardConversations);
  };

  const handleForwardTo = async (destConversationId: string) => {
    if (!user || !forwardMessageTarget) return;
    const text = await resolveGroupMessageText(forwardMessageTarget, groupKey);
    setForwardMessageTarget(null);
    if (!text) return;
    await forwardMessage(destConversationId, user.id, text);
  };

  const scrollToMessage = (messageId: string) => {
    document.getElementById(`gmsg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const typingNames = typingUserIds.map((uid) => authors.get(uid)?.name.split(" ")[0] ?? "Someone");
  const typingText =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
      ? `${typingNames[0]} is typing…`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing…`
      : `${typingNames[0]}, ${typingNames[1]} and ${typingNames.length - 2} others are typing…`;

  return (
    <div
      className={
        isDesktop
          ? "fixed inset-y-0 left-[360px] right-0 z-20 flex flex-col border-l border-white/5 bg-vyro-radial"
          : "fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col bg-vyro-radial"
      }
    >
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-3 safe-top">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 shrink-0 rounded-2xl" style={{ background: gradientFor(id ?? "group") }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{group?.name ?? "Loading…"}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-mist">
            {typingText ? (
              <span className="text-cyan-300">{typingText}</span>
            ) : (
              <>
                {group?.encrypted && <Lock className="h-2.5 w-2.5 text-emerald-400" />}
                {group ? `${group.member_count.toLocaleString()} members` : ""}
              </>
            )}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="rounded-full p-2 text-mist hover:bg-white/5">
            <MoreVertical className="h-4.5 w-4.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-2xl glass-strong">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/chat/group/${id}/info`);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-[13px] font-medium text-ink hover:bg-white/5"
              >
                <Info className="h-4 w-4" /> Group info
              </button>
              {canManageTopics && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setTopicSheetOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-[13px] font-medium text-ink hover:bg-white/5"
                >
                  <Plus className="h-4 w-4" /> {topics.length > 0 ? "New topic" : "Create topics"}
                </button>
              )}
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

      {topics.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/5 px-3 py-2">
          <button
            onClick={() => setActiveTopic(null)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${
              activeTopic === null ? "grad-purple-blue text-white" : "chip text-mist"
            }`}
          >
            General
          </button>
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTopic(t.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${
                activeTopic === t.id ? "grad-purple-blue text-white" : "chip text-mist"
              }`}
            >
              {t.icon} {t.name}
            </button>
          ))}
          {canManageTopics && (
            <button
              onClick={() => setTopicSheetOpen(true)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full chip text-mist"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

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
          <p className="py-16 text-center text-[13px] text-mist">No messages yet — say hi to the group 👋</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleMessages.map((m) => {
              const mine = m.sender_id === user?.id;
              const author = authors.get(m.sender_id);
              const repliedTo = m.reply_to_id ? messages?.find((x) => x.id === m.reply_to_id) : null;
              const seenCount = mine
                ? readPointers.filter((p) => p.user_id !== user?.id && new Date(p.last_read_at) >= new Date(m.created_at)).length
                : 0;
              const reactionCounts = new Map<string, number>();
              for (const r of m.reactions) reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) ?? 0) + 1);

              const bubbleInner = (
                <>
                  {m.forwarded && (
                    <p className={`mb-1 flex items-center gap-1 text-[10.5px] font-semibold ${mine ? "text-white/70" : "text-mist"}`}>
                      <Forward className="h-3 w-3" /> Forwarded
                    </p>
                  )}
                  {repliedTo && (
                    <button
                      onClick={() => scrollToMessage(repliedTo.id)}
                      className={`mb-1.5 block w-full truncate rounded-xl border-l-2 px-2 py-1 text-left text-[11.5px] ${
                        mine ? "border-white/50 bg-white/10 text-white/80" : "border-cyan-400 bg-white/5 text-mist"
                      }`}
                    >
                      {messagePreviewText(repliedTo)}
                    </button>
                  )}
                  {m.deleted_at ? (
                    <span className={`italic ${mine ? "text-white/60" : "text-mist"}`}>This message was deleted</span>
                  ) : m.poll ? (
                    <ChatPollBubble poll={m.poll} mine={mine} userId={user?.id ?? ""} onVote={(ids) => handleVote(m, ids)} onClose={() => handleClosePoll(m)} />
                  ) : m.location_lat != null && m.location_lng != null ? (
                    <ChatLocationBubble lat={m.location_lat} lng={m.location_lng} label={m.location_label} mine={mine} />
                  ) : m.sharedProfile ? (
                    <ChatContactBubble profile={m.sharedProfile} mine={mine} />
                  ) : m.image_url || m.video_url || m.file_url ? (
                    <ChatMediaBubble message={m} mine={mine} />
                  ) : m.audio_url ? (
                    <VoiceMessageBubble url={m.audio_url} duration={m.audio_duration_seconds ?? 0} mine={mine} />
                  ) : m.sticker_emoji ? (
                    <span className="block text-[64px] leading-none">{m.sticker_emoji}</span>
                  ) : (
                    <GroupMessageText message={m} groupKey={groupKey} />
                  )}
                  {!m.deleted_at && m.edited_at && (
                    <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-white/60" : "text-mist"}`}>edited</p>
                  )}
                </>
              );

              return (
                <div key={m.id} id={`gmsg-${m.id}`} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                    {!mine && <Avatar name={author?.name ?? "?"} avatarUrl={author?.avatar_url} size={32} />}
                    <div className="max-w-[75%]">
                      {!mine && <p className="mb-0.5 text-[11px] font-medium text-violet-300">{author?.name ?? "…"}</p>}
                      <PressableBubble mine={mine} bare={!!m.sticker_emoji && !m.deleted_at} onLongPress={() => setActionMessage(m)}>
                        {bubbleInner}
                      </PressableBubble>
                    </div>
                  </div>
                  {mine && !m.deleted_at && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-mist">
                      {seenCount > 0 ? (
                        <span className="flex items-center gap-0.5 text-cyan-300">
                          <Check className="h-3 w-3" /> Seen by {seenCount}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Sent
                        </span>
                      )}
                    </p>
                  )}
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
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(replyingTo || editingMessage) && (
        <div className="flex items-center justify-between gap-2 border-t border-white/5 px-3.5 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-cyan-400 pl-2.5">
            <p className="text-[11px] font-semibold text-cyan-300">
              {editingMessage ? "Editing message" : `Replying to ${authors.get(replyingTo?.sender_id ?? "")?.name ?? "message"}`}
            </p>
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
              onClick={() => (uploading ? undefined : setAttachMenuOpen(true))}
              disabled={uploading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full chip text-mist disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Paperclip className="h-4.5 w-4.5" />}
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-full chip px-3.5 py-2.5">
              <input
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Message the group..."
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
              />
            </div>
            {!input.trim() && (
              <button
                onClick={() => setStickerPickerOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full chip text-mist"
              >
                <Sticker className="h-4.5 w-4.5" />
              </button>
            )}
          </>
        )}
        {input.trim() ? (
          <button
            onClick={send}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full grad-purple-blue text-white"
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
          canModerate={myRole === "owner" || myRole === "admin"}
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

      {attachMenuOpen && (
        <AttachMenu
          onClose={() => setAttachMenuOpen(false)}
          onFile={() => fileInputRef.current?.click()}
          onPoll={() => setPollComposerOpen(true)}
          onLocation={handleSendLocation}
          onContact={() => setContactPickerOpen(true)}
        />
      )}

      {contactPickerOpen && user && (
        <ContactPickerSheet excludeId={user.id} onClose={() => setContactPickerOpen(false)} onPick={handleShareContact} />
      )}

      {pollComposerOpen && <CreatePollSheet onClose={() => setPollComposerOpen(false)} onCreate={handleCreatePoll} />}

      {topicSheetOpen && <CreateTopicSheet onClose={() => setTopicSheetOpen(false)} onCreate={handleCreateTopic} />}

      {stickerPickerOpen && <StickerPicker onClose={() => setStickerPickerOpen(false)} onPick={handleSendSticker} />}

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

function PressableBubble({
  mine,
  bare,
  onLongPress,
  children,
}: {
  mine: boolean;
  bare?: boolean;
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = () => {
    pressTimer.current = setTimeout(onLongPress, 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  return (
    <div
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none rounded-3xl text-[13.5px] leading-relaxed ${
        bare ? "bg-transparent px-1 py-1" : `px-4 py-2.5 ${mine ? "grad-purple-blue text-white" : "chip text-ink"}`
      }`}
    >
      {children}
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
