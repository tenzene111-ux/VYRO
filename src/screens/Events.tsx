import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Calendar, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { gradientFor } from "../lib/gradients";
import { useAuth } from "../context/AuthContext";
import { listEvents, setRsvp, type VyroEvent } from "../lib/api";

export function Events() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<VyroEvent[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    listEvents(user.id).then(setEvents);
  };

  useEffect(load, [user]);

  const handleRsvp = async (eventId: string, current: VyroEvent["my_status"]) => {
    if (!user) return;
    setBusyId(eventId);
    try {
      await setRsvp(eventId, user.id, current === "going" ? null : "going");
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-xl font-bold text-ink">Events</h1>
        </div>
        <button onClick={() => navigate("/create/event")} className="rounded-full p-2 chip text-mist">
          <Plus className="h-4.5 w-4.5" />
        </button>
      </header>

      {events === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">No events yet</p>
          <p className="max-w-[240px] text-[12.5px] text-mist">Host the first one on VYRO.</p>
          <button
            onClick={() => navigate("/create/event")}
            className="mt-2 rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white glow-violet"
          >
            Create Event
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-8">
          {events.map((e) => {
            const going = e.my_status === "going";
            const date = new Date(e.starts_at);
            return (
              <div key={e.id} className="overflow-hidden rounded-3xl glass-card">
                <div className="relative h-28" style={{ background: gradientFor(e.id) }}>
                  <div className="absolute left-3 top-3 rounded-xl bg-black/40 px-2.5 py-1.5 text-center backdrop-blur">
                    <p className="text-[10px] font-semibold uppercase text-white/80">
                      {date.toLocaleDateString([], { month: "short" })}
                    </p>
                    <p className="font-display text-base font-bold leading-none text-white">{date.getDate()}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-display text-sm font-bold text-ink">{e.title}</p>
                  {e.description && <p className="mt-1 text-[12.5px] text-mist">{e.description}</p>}
                  <div className="mt-2 flex flex-col gap-1 text-[11.5px] text-mist">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    {e.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {e.location}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={e.host.name} avatarUrl={e.host.avatar_url} size={20} />
                      <span className="text-[11px] text-mist">
                        Hosted by {e.host.name} · {e.going_count} going
                      </span>
                    </div>
                    <button
                      onClick={() => handleRsvp(e.id, e.my_status)}
                      disabled={busyId === e.id}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                        going ? "chip text-ink" : "grad-purple-blue text-white"
                      }`}
                    >
                      {going ? "Going ✓" : "RSVP"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
