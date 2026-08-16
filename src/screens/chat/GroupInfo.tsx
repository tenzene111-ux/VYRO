import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, ShieldCheck, Crown, MoreVertical, Ban, UserMinus, ChevronUp, ChevronDown, Pencil, Check, Bot, Plus, X,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { gradientFor } from "../../lib/gradients";
import { useAuth, type Profile } from "../../context/AuthContext";
import {
  getGroup,
  getMyGroupRole,
  listGroupMembersDetailed,
  listGroupBans,
  promoteGroupAdmin,
  demoteGroupAdmin,
  removeGroupMember,
  banGroupMember,
  unbanGroupMember,
  updateGroupInfo,
  setGroupWelcomeMessage,
  listAutoReplyRules,
  createAutoReplyRule,
  setAutoReplyRuleEnabled,
  deleteAutoReplyRule,
  type Group,
  type AutoReplyRule,
} from "../../lib/api";

type MemberRow = Profile & { role: string };

export function GroupInfo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [bans, setBans] = useState<Profile[] | null>(null);
  const [showBans, setShowBans] = useState(false);
  const [actionTarget, setActionTarget] = useState<MemberRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [autoReplies, setAutoReplies] = useState<AutoReplyRule[] | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");
  const [addingRule, setAddingRule] = useState(false);

  const load = () => {
    if (!id || !user) return;
    getGroup(id).then((g) => {
      setGroup(g);
      if (g) setWelcomeMessage(g.welcome_message ?? "");
    });
    getMyGroupRole(id, user.id).then(setMyRole);
    listGroupMembersDetailed(id).then((rows) =>
      setMembers(rows.sort((a, b) => roleWeight(a.role) - roleWeight(b.role) || a.name.localeCompare(b.name)))
    );
  };

  useEffect(load, [id, user]);

  const canManage = myRole === "owner" || myRole === "admin";

  const handleShowAutomation = () => {
    setShowAutomation((v) => !v);
    if (!autoReplies && id) listAutoReplyRules(id).then(setAutoReplies).catch(() => setAutoReplies([]));
  };

  const handleSaveWelcome = async () => {
    if (!id || savingWelcome) return;
    setSavingWelcome(true);
    try {
      await setGroupWelcomeMessage(id, welcomeMessage.trim());
      setGroup((g) => (g ? { ...g, welcome_message: welcomeMessage.trim() || null } : g));
    } finally {
      setSavingWelcome(false);
    }
  };

  const handleAddRule = async () => {
    if (!id || !user || !newKeyword.trim() || !newReply.trim() || addingRule) return;
    setAddingRule(true);
    try {
      const ruleId = await createAutoReplyRule(id, user.id, newKeyword.trim(), newReply.trim());
      setAutoReplies((prev) => [
        ...(prev ?? []),
        { id: ruleId, group_id: id, keyword: newKeyword.trim(), reply_text: newReply.trim(), enabled: true, created_at: new Date().toISOString() },
      ]);
      setNewKeyword("");
      setNewReply("");
    } finally {
      setAddingRule(false);
    }
  };

  const handleToggleRule = async (rule: AutoReplyRule) => {
    setAutoReplies((prev) => (prev ? prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)) : prev));
    try {
      await setAutoReplyRuleEnabled(rule.id, !rule.enabled);
    } catch {
      if (id) listAutoReplyRules(id).then(setAutoReplies);
    }
  };

  const handleDeleteRule = async (rule: AutoReplyRule) => {
    setAutoReplies((prev) => (prev ? prev.filter((r) => r.id !== rule.id) : prev));
    try {
      await deleteAutoReplyRule(rule.id);
    } catch {
      if (id) listAutoReplyRules(id).then(setAutoReplies);
    }
  };

  const handleStartEdit = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description ?? "");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!id || !editName.trim() || saving) return;
    setSaving(true);
    try {
      await updateGroupInfo(id, editName.trim(), editDescription.trim());
      setGroup((g) => (g ? { ...g, name: editName.trim(), description: editDescription.trim() || null } : g));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleShowBans = () => {
    setShowBans((v) => !v);
    if (!bans && id) listGroupBans(id).then(setBans);
  };

  const handlePromote = async (member: MemberRow) => {
    if (!id) return;
    setActionTarget(null);
    setMembers((prev) => (prev ? prev.map((m) => (m.id === member.id ? { ...m, role: "admin" } : m)) : prev));
    try {
      await promoteGroupAdmin(id, member.id);
    } catch {
      load();
    }
  };

  const handleDemote = async (member: MemberRow) => {
    if (!id) return;
    setActionTarget(null);
    setMembers((prev) => (prev ? prev.map((m) => (m.id === member.id ? { ...m, role: "member" } : m)) : prev));
    try {
      await demoteGroupAdmin(id, member.id);
    } catch {
      load();
    }
  };

  const handleRemove = async (member: MemberRow) => {
    if (!id || !window.confirm(`Remove ${member.name} from the group?`)) return;
    setActionTarget(null);
    setMembers((prev) => (prev ? prev.filter((m) => m.id !== member.id) : prev));
    try {
      await removeGroupMember(id, member.id);
    } catch {
      load();
    }
  };

  const handleBan = async (member: MemberRow) => {
    if (!id || !window.confirm(`Ban ${member.name}? They won't be able to rejoin.`)) return;
    setActionTarget(null);
    setMembers((prev) => (prev ? prev.filter((m) => m.id !== member.id) : prev));
    try {
      await banGroupMember(id, member.id);
    } catch {
      load();
    }
  };

  const handleUnban = async (profile: Profile) => {
    if (!id) return;
    setBans((prev) => (prev ? prev.filter((p) => p.id !== profile.id) : prev));
    try {
      await unbanGroupMember(id, profile.id);
    } catch {
      if (id) listGroupBans(id).then(setBans);
    }
  };

  if (!group) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-vyro-radial">
        <Loader2 className="h-5 w-5 animate-spin text-mist" />
      </div>
    );
  }

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Group info</h1>
      </header>

      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-3 h-20 w-20 rounded-3xl" style={{ background: gradientFor(group.id) }} />
        {editing ? (
          <div className="w-full">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Group name"
              className="mb-2 w-full rounded-xl chip px-3.5 py-2 text-center text-sm font-semibold text-ink placeholder:text-mist focus:outline-none"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full resize-none rounded-xl chip px-3.5 py-2 text-center text-[12.5px] text-ink placeholder:text-mist focus:outline-none"
            />
            <div className="mt-2 flex justify-center gap-2">
              <button onClick={() => setEditing(false)} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-mist">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
                className="flex items-center gap-1.5 rounded-full grad-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <p className="font-display text-lg font-bold text-ink">{group.name}</p>
              {canManage && (
                <button onClick={handleStartEdit} className="text-mist hover:text-ink">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {group.description && <p className="mt-1 max-w-[280px] text-[12.5px] text-mist">{group.description}</p>}
            <p className="mt-1 text-[11.5px] text-mist">
              {group.member_count.toLocaleString()} members · {group.privacy}
            </p>
          </>
        )}
      </div>

      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-mist">Members</p>
      <div className="mb-5 overflow-hidden rounded-2xl glass-card">
        {members === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-mist" />
          </div>
        ) : (
          members.map((m) => {
            const isSelf = m.id === user?.id;
            const canAct = canManage && !isSelf && m.role !== "owner" && !(myRole === "admin" && m.role === "admin");
            return (
              <div key={m.id} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-b-0">
                <Avatar name={m.name} avatarUrl={m.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {m.name}
                    {isSelf && <span className="text-mist"> (you)</span>}
                  </p>
                  <p className="text-[11px] text-mist">@{m.username}</p>
                </div>
                {m.role === "owner" && (
                  <span className="flex items-center gap-1 rounded-full chip px-2.5 py-1 text-[10.5px] font-semibold text-amber-300">
                    <Crown className="h-3 w-3" /> Owner
                  </span>
                )}
                {m.role === "admin" && (
                  <span className="flex items-center gap-1 rounded-full chip px-2.5 py-1 text-[10.5px] font-semibold text-cyan-300">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </span>
                )}
                {canAct && (
                  <button onClick={() => setActionTarget(m)} className="rounded-full p-1.5 text-mist hover:bg-white/5 hover:text-ink">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {canManage && (
        <div className="mb-8">
          <button onClick={handleShowBans} className="flex w-full items-center justify-between px-1 py-1 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mist">Banned users</p>
            {showBans ? <ChevronUp className="h-3.5 w-3.5 text-mist" /> : <ChevronDown className="h-3.5 w-3.5 text-mist" />}
          </button>
          {showBans && (
            <div className="mt-2 overflow-hidden rounded-2xl glass-card">
              {bans === null ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-mist" />
                </div>
              ) : bans.length === 0 ? (
                <p className="px-3.5 py-3 text-[12.5px] text-mist">No banned users.</p>
              ) : (
                bans.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-b-0">
                    <Avatar name={p.name} avatarUrl={p.avatar_url} size={36} />
                    <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{p.name}</p>
                    <button
                      onClick={() => handleUnban(p)}
                      className="rounded-full chip px-3 py-1.5 text-[11.5px] font-semibold text-ink"
                    >
                      Unban
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div className="mb-8">
          <button onClick={handleShowAutomation} className="flex w-full items-center justify-between px-1 py-1 text-left">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-mist">
              <Bot className="h-3.5 w-3.5" /> Automation
            </p>
            {showAutomation ? <ChevronUp className="h-3.5 w-3.5 text-mist" /> : <ChevronDown className="h-3.5 w-3.5 text-mist" />}
          </button>
          {showAutomation && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="rounded-2xl glass-card p-3.5">
                <p className="mb-1.5 text-[12.5px] font-semibold text-ink">Welcome message</p>
                <p className="mb-2 text-[11px] text-mist">
                  Posted automatically when someone joins. Use <span className="font-mono text-ink/80">{"{name}"}</span> for their name.
                </p>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="e.g. Welcome to the group, {name}! 👋"
                  rows={2}
                  className="mb-2 w-full resize-none rounded-xl chip px-3 py-2 text-[12.5px] text-ink placeholder:text-mist focus:outline-none"
                />
                <button
                  onClick={handleSaveWelcome}
                  disabled={savingWelcome}
                  className="flex items-center gap-1.5 rounded-full grad-primary px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {savingWelcome && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </button>
              </div>

              <div className="rounded-2xl glass-card p-3.5">
                <p className="mb-1.5 text-[12.5px] font-semibold text-ink">Keyword auto-replies</p>
                <p className="mb-2 text-[11px] text-mist">
                  When a message contains a keyword, the group posts the matching reply automatically.
                </p>

                {autoReplies === null ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-mist" />
                  </div>
                ) : (
                  autoReplies.length > 0 && (
                    <div className="mb-3 flex flex-col gap-1.5">
                      {autoReplies.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 rounded-xl chip px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold text-ink">{r.keyword}</p>
                            <p className="truncate text-[11px] text-mist">{r.reply_text}</p>
                          </div>
                          <button
                            onClick={() => handleToggleRule(r)}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                              r.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-mist"
                            }`}
                          >
                            {r.enabled ? "On" : "Off"}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(r)}
                            className="shrink-0 rounded-full p-1 text-mist hover:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                <div className="flex flex-col gap-1.5">
                  <input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Keyword (e.g. rules)"
                    className="w-full rounded-xl chip px-3 py-2 text-[12.5px] text-ink placeholder:text-mist focus:outline-none"
                  />
                  <input
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Auto-reply text"
                    className="w-full rounded-xl chip px-3 py-2 text-[12.5px] text-ink placeholder:text-mist focus:outline-none"
                  />
                  <button
                    onClick={handleAddRule}
                    disabled={!newKeyword.trim() || !newReply.trim() || addingRule}
                    className="flex items-center justify-center gap-1.5 rounded-full grad-primary px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    {addingRule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add rule
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {actionTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setActionTarget(null)} />
          <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-[440px] overflow-hidden rounded-3xl glass-strong">
            {myRole === "owner" &&
              (actionTarget.role === "admin" ? (
                <ActionRow icon={ShieldCheck} label="Remove admin" onClick={() => handleDemote(actionTarget)} />
              ) : (
                <ActionRow icon={ShieldCheck} label="Make admin" onClick={() => handlePromote(actionTarget)} />
              ))}
            <ActionRow icon={UserMinus} label="Remove from group" danger onClick={() => handleRemove(actionTarget)} />
            <ActionRow icon={Ban} label="Ban from group" danger onClick={() => handleBan(actionTarget)} />
          </div>
        </>
      )}
    </div>
  );
}

function roleWeight(role: string) {
  if (role === "owner") return 0;
  if (role === "admin") return 1;
  return 2;
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof ShieldCheck;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left text-[13.5px] font-medium last:border-b-0 hover:bg-white/5 ${
        danger ? "text-rose-400" : "text-ink"
      }`}
    >
      <Icon className="h-4.5 w-4.5" />
      {label}
    </button>
  );
}
