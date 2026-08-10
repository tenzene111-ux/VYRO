import { useNavigate } from "react-router-dom";
import { MessageCircle, UserPlus, UserCheck, X } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { users } from "../../data/mock";

const friends = users.slice(1, 6);
const requests = users.slice(6, 8);
const suggested = users.slice(8, 11);

export function PeopleTab() {
  const navigate = useNavigate();

  return (
    <div className="px-4">
      {requests.length > 0 && (
        <Section title="Friend Requests">
          <div className="flex flex-col gap-2.5">
            {requests.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl glass-card p-2.5">
                <Avatar name={u.name} size={46} online={u.online} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  <p className="text-[11px] text-mist">@{u.username}</p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-full grad-purple-blue text-white">
                  <UserCheck className="h-4 w-4" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-full chip text-mist">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Friends">
        <div className="flex flex-col">
          {friends.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
              <button onClick={() => navigate(`/profile/${u.id}`)}>
                <Avatar name={u.name} size={48} online={u.online} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                <p className="text-[11px] text-mist">{u.online ? "Active now" : "Offline"}</p>
              </div>
              <button
                onClick={() => navigate(`/chat/c1`)}
                className="flex h-9 w-9 items-center justify-center rounded-full chip text-violet-300"
              >
                <MessageCircle className="h-4.5 w-4.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="People You May Know">
        <div className="flex flex-col gap-2.5">
          {suggested.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl glass-card p-2.5">
              <Avatar name={u.name} size={46} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                <p className="text-[11px] text-mist">@{u.username}</p>
              </div>
              <button className="flex items-center gap-1 rounded-full grad-purple-blue px-3 py-1.5 text-xs font-semibold text-white">
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}
