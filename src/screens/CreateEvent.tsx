import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, CalendarPlus, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createEvent } from "../lib/api";

export function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !title.trim() || !date) return;
    setBusy(true);
    setError(null);
    try {
      const startsAt = new Date(`${date}T${time || "12:00"}`).toISOString();
      await createEvent(user.id, title.trim(), description.trim(), location.trim(), startsAt);
      navigate("/events", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the event. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-vyro-radial px-5 safe-top">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <X className="h-4.5 w-4.5" />
        </button>
        <p className="font-display text-base font-semibold text-ink">Create Event</p>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || !date || busy}
          className="flex items-center gap-1.5 rounded-full grad-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create
        </button>
      </header>

      <div className="flex flex-col items-center gap-3 py-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl grad-primary glow-violet">
          <CalendarPlus className="h-7 w-7 text-white" />
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Event title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sunset Photography Walk"
            className="rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-mist">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-2xl chip px-4 py-3 text-sm text-ink focus:outline-none"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-mist">Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-2xl chip px-4 py-3 text-sm text-ink focus:outline-none"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where's it happening?"
            className="rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-mist">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What should people know?"
            className="resize-none rounded-2xl chip px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-[12.5px] text-rose-400">{error}</p>}
    </div>
  );
}
