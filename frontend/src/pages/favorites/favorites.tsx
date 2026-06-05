import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Star, Clock, Navigation, Trash2, MapPin, Tag } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Place {
  id: string;
  name: string;
  rating: number;
  distance: number;
  address: string;
  openNow: boolean;
  types: string[];
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<Place[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("favorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const removeFromFavorites = (id: string) => {
    const updated = favorites.filter((p) => p.id !== id);
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
    toast.error("Removed from favorites");
  };

  const clearAll = () => {
    setFavorites([]);
    localStorage.removeItem("favorites");
    toast.success("All favorites cleared");
  };

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Header - Updated to stick to the very top */}
      <div className="border-b border-zinc-800/50 sticky top-0 z-50 bg-black/60 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="mr-2 p-2 hover:bg-zinc-800 rounded-full transition-colors"
              title="Go Back"
            >
              {/* Optional Back button inside the header since Navbar is gone */}
              <svg xmlns="http://www.w3.org/2000/svg"width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 hover:text-white"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <Heart className="w-8 h-8 text-[#F472B6] fill-[#F472B6]" />
            <h1 className="text-3xl font-bold">Saved Places</h1>
            <span className="bg-[#BE185D]/20 text-[#F472B6] text-xs px-3 py-1 rounded-full font-bold ml-2">
              {favorites.length} saved
            </span>
          </div>
          {favorites.length > 0 && (
            <button onClick={clearAll} className="text-sm text-zinc-400 hover:text-rose-400 transition">
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
            <Heart className="w-16 h-16 text-zinc-800" />
            <h2 className="text-xl font-semibold text-zinc-400">No saved places yet</h2>
            <p className="text-zinc-600">Explore places and save your favorites to view them here.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 bg-[#BE185D] hover:bg-[#9D174D] px-8 py-3 rounded-xl font-bold transition-all active:scale-95 text-white"
            >
              Discover Places
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-4">
              {favorites.map((place, i) => (
                <motion.div
                  key={place.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-zinc-900/40 backdrop-blur-md rounded-2xl p-6 border border-zinc-800 hover:border-[#BE185D]/50 transition-all shadow-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">{place.name}</h3>
                      <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#BE185D]" /> {place.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[#FCD34D] bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700/50">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold text-sm">{place.rating}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-5 text-sm font-semibold">
                    <span className={`flex items-center gap-1.5 ${place.openNow ? "text-emerald-400" : "text-rose-400"}`}>
                      <Clock className="w-4 h-4" /> {place.openNow ? "Open Now" : "Closed"}
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <Navigation className="w-4 h-4 text-[#BE185D]" /> {place.distance} km away
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <Tag className="w-4 h-4 text-[#BE185D]" /> {place.types[0]}
                    </span>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button className="flex-1 bg-[#BE185D] hover:bg-[#9D174D] text-white py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95">
                      <MapPin className="w-4 h-4" /> Get Directions
                    </button>
                    <button
                      onClick={() => removeFromFavorites(place.id)}
                      className="p-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:border-rose-500 hover:text-rose-400 transition active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Favorites;