import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Key = "messages" | "groups" | "sound" | "vibration" | "preview";

const ROWS: { key: Key; label: string; hint: string }[] = [
  { key: "messages", label: "Message notifications", hint: "New direct messages" },
  { key: "groups", label: "Group notifications", hint: "Activity in groups you're in" },
  { key: "sound", label: "Sound", hint: "Play a sound for new notifications" },
  { key: "vibration", label: "Vibration", hint: "Vibrate on new notifications" },
  { key: "preview", label: "Show message preview", hint: "Show the message text in the notification" },
];

function storageKey(key: Key) {
  return `vyro-notif-${key}`;
}

function loadValue(key: Key) {
  return localStorage.getItem(storageKey(key)) !== "off";
}

export function NotificationSettings() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<Key, boolean>>(() =>
    Object.fromEntries(ROWS.map((r) => [r.key, loadValue(r.key)])) as Record<Key, boolean>
  );

  const handleToggle = (key: Key) => {
    setValues((prev) => {
      const next = !prev[key];
      localStorage.setItem(storageKey(key), next ? "on" : "off");
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Notifications</h1>
      </header>

      <div className="overflow-hidden rounded-2xl glass-card">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-3.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] text-ink">{row.label}</p>
              <p className="text-[11.5px] text-mist">{row.hint}</p>
            </div>
            <button
              onClick={() => handleToggle(row.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                values[row.key] ? "grad-purple-blue" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  values[row.key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
