import { useNavigate } from "react-router-dom";
import { Avatar } from "./Avatar";
import type { Profile } from "../context/AuthContext";

export function ChatContactBubble({ profile, mine }: { profile: Profile; mine: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/profile/${profile.id}`)}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ${mine ? "bg-white/10" : "bg-black/10"}`}
    >
      <Avatar name={profile.name} avatarUrl={profile.avatar_url} size={36} />
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-semibold">{profile.name}</p>
        <p className={`truncate text-[10.5px] ${mine ? "text-white/70" : "opacity-70"}`}>@{profile.username}</p>
      </div>
    </button>
  );
}
