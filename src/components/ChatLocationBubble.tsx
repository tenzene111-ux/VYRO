import { MapPin } from "lucide-react";

export function ChatLocationBubble({ lat, lng, label, mine }: { lat: number; lng: number; label: string | null; mine: boolean }) {
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${mine ? "bg-white/10" : "bg-black/10"}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${mine ? "bg-white/15" : "bg-cyan-400/15"}`}>
        <MapPin className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold">{label || "Shared location"}</p>
        <p className={`text-[10.5px] ${mine ? "text-white/70" : "opacity-70"}`}>
          {lat.toFixed(5)}, {lng.toFixed(5)} · Open in Maps
        </p>
      </div>
    </a>
  );
}
