import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { gradientFor } from "../lib/gradients";
import { listMarketplaceListings, type Listing } from "../lib/api";

export function Marketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[] | null>(null);

  useEffect(() => {
    listMarketplaceListings().then(setListings);
  }, []);

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

      {listings === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mist" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">No listings yet</p>
          <p className="max-w-[240px] text-[12.5px] text-mist">Be the first to sell something on VYRO.</p>
          <button
            onClick={() => navigate("/create/sell")}
            className="mt-2 rounded-full grad-primary px-5 py-2.5 text-sm font-semibold text-white glow-violet"
          >
            List an item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-8">
          {listings.map((l) => (
            <div key={l.id} className="overflow-hidden rounded-2xl glass-card">
              <div className="aspect-square" style={{ background: gradientFor(l.id) }} />
              <div className="p-3">
                <p className="truncate text-[13px] font-semibold text-ink">{l.title}</p>
                <p className="mt-0.5 font-display text-sm font-bold text-cyan-300">${l.price.toFixed(2)}</p>
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
