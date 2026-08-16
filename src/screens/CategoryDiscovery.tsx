import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PostCard } from "../components/PostCard";
import { ShortVideoCard } from "../components/ShortVideoCard";
import { useAuth } from "../context/AuthContext";
import { getCategory, matchedCategoryIds } from "../lib/categories";
import { listFeedPosts, type FeedPost } from "../lib/api";

export function CategoryDiscovery() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);

  const category = getCategory(id);

  useEffect(() => {
    if (!user || !category) return;
    listFeedPosts(user.id).then((all) => {
      if (category.keywords.length === 0) {
        setPosts([...all].sort((a, b) => b.like_count + b.comment_count - (a.like_count + a.comment_count)));
        return;
      }
      setPosts(all.filter((p) => matchedCategoryIds(p.text).includes(category.id)));
    });
  }, [user, category]);

  if (!category) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-vyro-radial">
        <p className="text-sm text-mist">Category not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${category.grad}`}>
          <category.icon className="h-4.5 w-4.5 text-white" />
        </span>
        <h1 className="font-display text-lg font-bold text-ink">{category.label}</h1>
      </header>

      <p className="mb-5 text-[13px] text-mist">{category.description}</p>

      {posts === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">Nothing here yet</p>
          <p className="max-w-[240px] text-[12.5px] text-mist">Be the first to create something in {category.label}.</p>
          <button
            onClick={() => navigate("/create/post")}
            className="mt-2 rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white glow-violet"
          >
            Create Post
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {posts.map((p) => (p.video_url ? <ShortVideoCard key={p.id} post={p} /> : <PostCard key={p.id} post={p} />))}
        </div>
      )}
    </div>
  );
}
