import { Flame, Music, Plane, Gamepad2, Trophy, Palette } from "lucide-react";

export type Category = {
  id: string;
  label: string;
  icon: typeof Flame;
  grad: string;
  description: string;
  keywords: string[];
};

export const categories: Category[] = [
  {
    id: "trending",
    label: "Trending",
    icon: Flame,
    grad: "from-orange-500 to-pink-500",
    description: "Discover what everyone is watching right now.",
    keywords: [],
  },
  {
    id: "music",
    label: "Music",
    icon: Music,
    grad: "from-cyan-500 to-blue-500",
    description: "Discover sounds, artists and music creators.",
    keywords: ["music", "song", "sound", "singer", "artist", "album", "beat", "melody"],
  },
  {
    id: "travel",
    label: "Travel",
    icon: Plane,
    grad: "from-violet-500 to-fuchsia-500",
    description: "Explore places, experiences and hidden destinations.",
    keywords: ["travel", "trip", "bhutan", "journey", "destination", "explore", "adventure", "mountain", "hike"],
  },
  {
    id: "gaming",
    label: "Gaming",
    icon: Gamepad2,
    grad: "from-blue-500 to-indigo-500",
    description: "Watch gameplay, tips, tournaments and gaming creators.",
    keywords: ["game", "gaming", "esports", "gamer", "playthrough", "stream"],
  },
  {
    id: "sports",
    label: "Sports",
    icon: Trophy,
    grad: "from-amber-500 to-orange-500",
    description: "Live the action. Highlights, skills, news and community.",
    keywords: ["sport", "football", "cricket", "basketball", "match", "tournament", "team", "archery"],
  },
  {
    id: "art",
    label: "Art & Design",
    icon: Palette,
    grad: "from-fuchsia-500 to-purple-600",
    description: "Discover creativity from artists and designers.",
    keywords: ["art", "design", "illustration", "drawing", "painting", "creative", "artist", "sketch"],
  },
];

export function getCategory(id: string | undefined): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function matchedCategoryIds(text: string): string[] {
  const haystack = text.toLowerCase();
  return categories.filter((c) => c.keywords.length > 0 && c.keywords.some((k) => haystack.includes(k))).map((c) => c.id);
}
