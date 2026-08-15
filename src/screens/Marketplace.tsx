import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, Search, Car, Smartphone, Home as HomeIcon, Shirt, Grid3x3 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { gradientFor } from "../lib/gradients";
import { listMarketplaceListings, type Listing } from "../lib/api";

const categories = [
  { label: "Vehicles", icon: Car },
  { label: "Electronics", icon: Smartphone },
  { label: "Home", icon: HomeIcon },
  { label: "Fashion", icon: Shirt },
  { label: "More", icon: Grid3x3 },
];

export function Marketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    listMarketplaceListings().then(setListings);
  }, []);

  const filtered = (listings ?? []).filter((l) => {
    const matchesQuery = l.title.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = !category || category === "More" || l.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="min-h-svh bg-vyro-radial px-4 safe-top">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 chip text-mist">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-xl font-bold text-ink">Marketplace</h1>
        </div>
        <button onClick={() => navigate("/create/sell")} className="rounded-full p-2 chip text-mist">
          <Plus className="h-4.5 w-4.5" />
        </button>
      </header>

      <div className="mb-4 flex items-center gap-2 rounded-2xl chip px-3.5 py-2.5">
        <Search className="h-4 w-4 text-mist" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items, categories"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
        />
      </div>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-4 overflow-x-auto px-4">
        {categories.map((c) => (
          <button
            key={c.label}
            onClick={() => setCategory((cur) => (cur === c.label ? null : c.label))}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                category === c.label ? "grad-primary text-white" : "chip text-mist"
              }`}
            >
              <c.icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] text-mist">{c.label}</span>
          </button>
        ))}
      </div>

      {listings === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">
            {listings.length === 0 ? "No listings yet" : "No matches"}
          </p>
          <p className="max-w-[240px] text-[12.5px] text-mist">
            {listings.length === 0 ? "Be the first to sell something on VYRO." : "Try a different search or category."}
          </p>
          {listings.length === 0 && (
            <button
              onClick={() => navigate("/create/sell")}
              className="mt-2 rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white glow-violet"
            >
              List an item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-8">
          {filtered.map((l) => (
            <div key={l.id} className="overflow-hidden rounded-2xl glass-card">
              <div className="aspect-square" style={{ background: gradientFor(l.id) }} />
              <div className="p-3">
                <p className="truncate text-[13px] font-semibold text-ink">{l.title}</p>
                <p className="mt-0.5 font-display text-sm font-bold text-cyan-300">Nu. {Math.round(l.price).toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Avatar name={l.seller.name} avatarUrl={l.seller.avatar_url} size={18} />
                  <span className="truncate text-[11px] text-mist">{l.seller.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
