import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, FileText, Video, Radio, Flag, Loader2, Check, X, Trash2, ShieldAlert, ShieldOff, Search,
} from "lucide-react";
import { Avatar } from "../components/Avatar";
import {
  getAdminDashboardCounts, listPendingReports, resolveReport, adminDeletePost, adminSetUserStatus, adminSearchUsers,
  type AdminDashboardCounts, type Report,
} from "../lib/api";
import type { Profile } from "../context/AuthContext";

type Tab = "dashboard" | "reports" | "users";

export function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="min-h-svh bg-vyro-radial px-4 pb-8 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Admin</h1>
      </header>

      <div className="mb-4 flex gap-2">
        {([
          ["dashboard", "Dashboard"],
          ["reports", "Reports"],
          ["users", "Users"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              tab === id ? "grad-primary text-white" : "chip text-mist"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}

function DashboardTab() {
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null);

  useEffect(() => {
    getAdminDashboardCounts().then(setCounts);
  }, []);

  if (!counts) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-mist" />
      </div>
    );
  }

  const tiles = [
    { icon: Users, label: "Total Users", value: counts.totalUsers },
    { icon: FileText, label: "Total Posts", value: counts.totalPosts },
    { icon: Video, label: "Total Videos", value: counts.totalVideos },
    { icon: Radio, label: "Live Streams", value: counts.totalLiveStreams },
    { icon: Flag, label: "Pending Reports", value: counts.pendingReports },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl glass-card p-4">
          <t.icon className="mb-2 h-5 w-5 text-violet-300" />
          <p className="font-display text-2xl font-bold text-ink">{t.value.toLocaleString()}</p>
          <p className="text-[11.5px] text-mist">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    listPendingReports().then(setReports);
  };
  useEffect(load, []);

  const handleDismiss = async (id: string) => {
    setBusyId(id);
    try {
      await resolveReport(id, "dismissed");
      load();
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveContent = async (report: Report) => {
    setBusyId(report.id);
    try {
      if (report.target_type === "post") await adminDeletePost(report.target_id);
      await resolveReport(report.id, "actioned");
      load();
    } finally {
      setBusyId(null);
    }
  };

  const handleSuspendUser = async (report: Report, status: "suspended" | "banned") => {
    setBusyId(report.id);
    try {
      const targetUserId = report.target_type === "user" ? report.target_id : report.reporter_id;
      await adminSetUserStatus(targetUserId, status);
      await resolveReport(report.id, "actioned");
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (reports === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-mist" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Flag className="h-7 w-7 text-mist" />
        <p className="font-display text-sm font-semibold text-ink">No pending reports</p>
        <p className="text-[12.5px] text-mist">You're all caught up.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => (
        <div key={r.id} className="rounded-2xl glass-card p-4">
          <div className="mb-2 flex items-center gap-2.5">
            <Avatar name={r.reporter.name} avatarUrl={r.reporter.avatar_url} size={28} />
            <p className="text-[12px] text-mist">
              <span className="font-semibold text-ink">{r.reporter.name}</span> reported a {r.target_type.replace("_", " ")}
            </p>
          </div>
          <p className="mb-3 text-[13px] text-ink/90">
            <span className="font-semibold">{r.reason}</span>
            {r.details && ` — ${r.details}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={X} label="Dismiss" onClick={() => handleDismiss(r.id)} busy={busyId === r.id} />
            {r.target_type === "post" && (
              <ActionBtn icon={Trash2} label="Remove" onClick={() => handleRemoveContent(r)} busy={busyId === r.id} danger />
            )}
            <ActionBtn icon={ShieldAlert} label="Suspend" onClick={() => handleSuspendUser(r, "suspended")} busy={busyId === r.id} danger />
            <ActionBtn icon={ShieldOff} label="Ban" onClick={() => handleSuspendUser(r, "banned")} busy={busyId === r.id} danger />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  busy,
  danger,
}: {
  icon: typeof X;
  label: string;
  onClick: () => void;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-40 ${
        danger ? "bg-rose-500/15 text-rose-400" : "chip text-ink"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function UsersTab() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    adminSearchUsers(query).then(setUsers);
  };
  useEffect(load, [query]);

  const handleSetStatus = async (userId: string, status: "active" | "suspended" | "banned") => {
    setBusyId(userId);
    try {
      await adminSetUserStatus(userId, status);
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <label className="mb-3 flex items-center gap-2.5 rounded-2xl chip px-4 py-2.5">
        <Search className="h-4 w-4 text-mist" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username"
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-mist focus:outline-none"
        />
      </label>

      {users === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl glass-card p-3">
              <Avatar name={u.name} avatarUrl={u.avatar_url} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{u.name}</p>
                <p className="text-[11px] text-mist">
                  @{u.username} · <span className={u.status === "active" ? "text-emerald-300" : "text-rose-400"}>{u.status}</span>
                </p>
              </div>
              {busyId === u.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-mist" />
              ) : u.status === "active" ? (
                <button
                  onClick={() => handleSetStatus(u.id, "suspended")}
                  className="shrink-0 rounded-full bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold text-rose-400"
                >
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => handleSetStatus(u.id, "active")}
                  className="flex shrink-0 items-center gap-1 rounded-full chip px-3 py-1.5 text-[11px] font-semibold text-emerald-300"
                >
                  <Check className="h-3 w-3" /> Reactivate
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
