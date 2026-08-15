import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X, QrCode, MessageCircle, Flame, Music, Plane, Gamepad2, Trophy, Palette, Heart, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { gradientFor } from "../lib/gradients";
import { useAuth, type Profile } from "../context/AuthContext";
import {
  listFollowing, listProfiles, listTopPosts, listTrendingHashtags, searchPeopleAndPosts, toggleFollow,
  type FeedPost, type TrendingHashtag,
} from "../lib/api";

const categories = [
  { id: "trending", label: "Trending", icon: Flame, grad: "from-orange-500 to-pink-500" },
  { id: "music", label: "Music", icon: Music, grad: "from-cyan-500 to-blue-500" },
  { id: "travel", label: "Travel", icon: Plane, grad: "from-violet-500 to-fuchsia-500" },
  { id: "gaming", label: "Gaming", icon: Gamepad2, grad: "from-blue-500 to-indigo-500" },
  { id: "sports", label: "Sports", icon: Trophy, grad: "from-amber-500 to-orange-500" },
  { id: "art", label: "Art & Design", icon: Palette, grad: "from-fuchsia-500 to-purple-600" },
];

export function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [topPosts, setTopPosts] = useState<FeedPost[]>([]);
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<{ people: Profile[]; posts: FeedPost[] } | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([listProfiles(user.id), listFollowing(user.id)]).then(([profiles, following]) => {
      setSuggested(profiles.filter((p) => !following.has(p.id)).slice(0, 4));
    });
    listTopPosts(user.id, 5).then(setTopPosts);
    listTrendingHashtags().then(setHashtags);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      searchPeopleAndPosts(user.id, q)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, user]);

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    setSuggested((prev) => prev.filter((p) => p.id !== targetId));
    try {
      await toggleFollow(user.id, targetId, false);
    } catch {
      // leave it removed from the list; user can re-follow from People tab if this failed
    }
  };

  const showingSearch = query.trim().length > 0;

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center justify-between py-4">
        <h1 className="font-display text-xl font-bold text-ink">Explore</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/chat")} className="rounded-full p-2 chip text-mist">
            <MessageCircle className="h-4.5 w-4.5" />
          </button>
          <button onClick={() => navigate("/create/sell")} className="rounded-full p-2 chip text-mist">
            <QrCode className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      <div className="mb-5 flex items-center gap-2 rounded-2xl chip px-4 py-3">
        <Search className="h-4.5 w-4.5 text-mist" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos, users, hashtags"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")}>
            <X className="h-4 w-4 text-mist" />
          </button>
        )}
      </div>

      {showingSearch ? (
        <div className="pb-8">
          {searching ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-mist" />
            </div>
          ) : !results || (results.people.length === 0 && results.posts.length === 0) ? (
            <p className="py-16 text-center text-[13px] text-mist">No results for "{query}"</p>
          ) : (
            <>
              {results.people.length > 0 && (
                <>
                  <SectionHeader title="People" />
                  <div className="mb-6 flex flex-col gap-2.5">
                    {results.people.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/profile/${p.id}`)}
                        className="flex items-center gap-3 rounded-2xl glass-card p-2.5 text-left"
                      >
                        <Avatar name={p.name} avatarUrl={p.avatar_url} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                          <p className="text-[11px] text-mist">@{p.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {results.posts.length > 0 && (
                <>
                  <SectionHeader title="Posts" />
                  <div className="flex flex-col gap-2.5">
                    {results.posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => navigate(`/profile/${post.author.id}`)}
                        className="flex items-start gap-3 rounded-2xl glass-card p-3 text-left"
                      >
                        <Avatar name={post.author.name} avatarUrl={post.author.avatar_url} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink">{post.author.name}</p>
                          <p className="line-clamp-2 text-[12.5px] text-mist">{post.text}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {hashtags.length > 0 && (
            <>
              <SectionHeader title="Trending Hashtags" />
              <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
                {hashtags.map((h) => (
                  <button
                    key={h.tag}
                    onClick={() => setQuery(h.tag)}
                    className="flex shrink-0 flex-col items-start gap-0.5 rounded-2xl chip px-3.5 py-2.5"
                  >
                    <span className="text-[13px] font-semibold text-cyan-300">{h.tag}</span>
                    <span className="text-[10.5px] text-mist">
                      {h.count} {h.count === 1 ? "post" : "posts"}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mb-6 grid grid-cols-3 gap-3">
            {categories.map((c) => (
              <button
                key={c.id}
                className="flex flex-col items-center gap-2 rounded-2xl glass-card p-3.5 active:scale-95 transition-transform"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.grad}`}>
                  <c.icon className="h-5 w-5 text-white" />
                </span>
                <span className="text-[12px] font-medium text-ink">{c.label}</span>
              </button>
            ))}
          </div>

          {topPosts.length > 0 && (
            <>
              <SectionHeader title="Trending Now" />
              <div className="mb-6 flex flex-col gap-3">
                {topPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => navigate(`/profile/${post.author.id}`)}
                    className="flex items-center gap-3 rounded-2xl glass-card p-3 text-left active:scale-[0.98] transition-transform"
                  >
                    {post.image_url ? (
                      <img src={post.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-xl" style={{ background: gradientFor(post.id) }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{post.author.name}</p>
                      <p className="truncate text-[11px] text-mist">{post.text}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-mist">
                      <Heart className="h-3.5 w-3.5" /> {post.like_count}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {suggested.length > 0 && (
            <>
              <SectionHeader title="People You May Know" />
              <div className="mb-6 grid grid-cols-2 gap-3">
                {suggested.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="flex flex-col items-center gap-2 rounded-2xl glass-card p-4 text-center"
                  >
                    <Avatar name={u.name} avatarUrl={u.avatar_url} size={64} />
                    <div>
                      <p className="text-sm font-semibold text-ink">{u.name}</p>
                      <p className="text-[11px] text-mist">@{u.username}</p>
                    </div>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollow(u.id);
                      }}
                      className="mt-1 w-full rounded-full grad-purple-blue py-1.5 text-xs font-semibold text-white"
                    >
                      Follow
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-[15px] font-semibold text-ink">{title}</h2>
    </div>
  );
}
