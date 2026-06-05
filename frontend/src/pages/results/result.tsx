import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  MapPin, Star, Clock, Navigation, Heart, Layers, SlidersHorizontal, X,
  ChevronLeft, ChevronRight, Phone, Car, MessageSquare, List,
  ArrowLeft, ArrowUpDown, Sparkles // 🔥 Added Sparkles here
} from "lucide-react";
import { toast } from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Polyline } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";

// --- SMART GREETING HELPER ---
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good Afternoon", emoji: "☀️" };
  if (hour < 20) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Good Night", emoji: "🌙" };
};

// --- CATEGORY EMOJI HELPER ---
const getCategoryEmoji = (type: string) => {
  if (type.includes("cafe")) return "☕";
  if (type.includes("gym") || type.includes("fitness")) return "🏋️";
  if (type.includes("restaurant") || type.includes("food")) return "🍽️";
  if (type.includes("bar") || type.includes("pub")) return "🍷";
  if (type.includes("library") || type.includes("book")) return "📚";
  return "📍";
};

// --- CUSTOM MAP ICON GENERATOR ---
const getCustomIcon = (type: string, isHovered = false) => {
  let emoji = "📍";
  if (type.includes("cafe")) emoji = "☕";
  else if (type.includes("gym") || type.includes("fitness")) emoji = "🏋️";
  else if (type.includes("restaurant") || type.includes("food")) emoji = "🍽️";
  else if (type.includes("bar") || type.includes("pub")) emoji = "🍷";
  else if (type.includes("library") || type.includes("book")) emoji = "📚";

  return L.divIcon({
    html: `<div style="background:${isHovered ? "#F472B6" : "#BE185D"};border:2px solid white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:${isHovered ? "0 8px 15px rgba(244,114,182,0.6)" : "0 4px 6px rgba(0,0,0,0.3)"};transform:${isHovered ? "scale(1.2)" : "scale(1)"};transition:all 0.3s ease;">${emoji}</div>`,
    className: "custom-leaflet-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

// --- SKELETON LOADER COMPONENT ---
const PlaceSkeleton = () => (
  <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl p-6 border border-zinc-800 animate-pulse">
    <div className="w-full h-48 bg-zinc-800 rounded-xl mb-5" />
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="h-6 bg-zinc-800 rounded-md w-3/4 mb-2" />
        <div className="h-4 bg-zinc-800 rounded-md w-1/2" />
      </div>
      <div className="w-10 h-10 bg-zinc-800 rounded-xl ml-4" />
    </div>
    <div className="flex gap-4 mt-6">
      <div className="h-4 bg-zinc-800 rounded-md w-20" />
      <div className="h-4 bg-zinc-800 rounded-md w-20" />
    </div>
    <div className="flex gap-3 mt-6">
      <div className="h-12 bg-zinc-800 rounded-xl flex-1" />
      <div className="h-12 bg-zinc-800 rounded-xl w-24" />
    </div>
  </div>
);

// --- SMART MAP RECENTER HELPER ---
const SmartMapController = ({
  center, activeRoute, userLoc,
}: {
  center: { lat: number; lng: number };
  activeRoute: { lat: number; lng: number } | null;
  userLoc: { lat: number; lng: number };
}) => {
  const map = useMap();
  useEffect(() => {
    if (activeRoute) {
      const bounds = L.latLngBounds(
        [userLoc.lat, userLoc.lng],
        [activeRoute.lat, activeRoute.lng]
      );
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    } else {
      map.flyTo([center.lat, center.lng], 14, { animate: true, duration: 1.5 });
    }
  }, [center, activeRoute, userLoc, map]);
  return null;
};

// --- INTERFACES ---
interface Place {
  id: string;
  name: string;
  rating: number;
  distance: number;
  address: string;
  openNow: boolean;
  priceLevel: number;
  types: string[];
  lat: number;
  lng: number;
  images: string[];
}

// --- NETFLIX STYLE MATCH CALCULATOR ---
const getMatchPercentage = (place: Place) => {
  // Deterministic random seed based on place ID (so it doesn't change on refresh)
  let seed = 0;
  for (let i = 0; i < place.id.length; i++) seed += place.id.charCodeAt(i);
  const randomBonus = (seed % 10) + 1; // 1 to 10 points

  const ratingScore = (place.rating / 5) * 45; // Max 45%
  const distanceScore = Math.max(0, (15 - place.distance) / 15) * 35; // Max 35%
  const openScore = place.openNow ? 10 : 0; // Max 10%

  return Math.min(99, Math.round(ratingScore + distanceScore + openScore + randomBonus));
};

// --- PLACE CARD COMPONENT ---
const PlaceCard = ({
  place, index, isFav, isHovered, toggleFavorite, setHoveredPlaceId, onViewOnMap, onCardClick,
}: {
  place: Place; index: number; isFav: boolean; isHovered: boolean;
  toggleFavorite: (p: Place) => void;
  setHoveredPlaceId: (id: string | null) => void;
  onViewOnMap: () => void;
  onCardClick: () => void;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const matchPercent = getMatchPercentage(place);

  // 🔥 DYNAMIC REASONS GENERATOR
  const getReasons = () => {
    const reasons = [];
    // 1. Intent Reason
    reasons.push({ icon: "✨", text: `Perfect match for your vibe` });
    // 2. Rating Reason
    if (place.rating >= 4.5) reasons.push({ icon: "⭐", text: `Top-rated in the area (${place.rating})` });
    else if (place.rating >= 4.0) reasons.push({ icon: "👍", text: `Highly rated by users (${place.rating})` });
    // 3. Distance Reason
    if (place.distance <= 2.0) reasons.push({ icon: "📍", text: `Super close! Just ${place.distance} km away` });
    else reasons.push({ icon: "🚗", text: `Only ${place.distance} km away` });
    // 4. Open Status
    if (place.openNow) reasons.push({ icon: "🟢", text: `Open right now` });
    
    return reasons;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={() => setHoveredPlaceId(place.id)}
      onMouseLeave={() => setHoveredPlaceId(null)}
      onClick={onCardClick}
      className={`bg-zinc-900/40 backdrop-blur-md rounded-2xl p-6 transition-all border shadow-lg cursor-pointer overflow-hidden ${
        isHovered
          ? "bg-zinc-900/70 border-[#F472B6] shadow-[0_0_20px_rgba(244,114,182,0.15)]"
          : "border-zinc-800/50 hover:border-[#BE185D]/30"
      }`}
    >
      {/* Image Carousel */}
      <div className="relative w-full h-48 mb-5 overflow-hidden rounded-xl bg-zinc-800 group">
        <img
          src={place.images[currentImageIndex]}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* NETFLIX STYLE MATCH BADGE */}
        <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-md text-[#46d369] font-black px-2.5 py-1 rounded-lg border border-[#46d369]/30 text-xs shadow-lg flex items-center gap-1">
          🔥 {matchPercent}% Match
        </div>

        {place.images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((p) => (p - 1 + place.images.length) % place.images.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((p) => (p + 1) % place.images.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {place.images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className={`text-xl font-bold flex items-center gap-2 transition-colors ${isHovered ? "text-[#F472B6]" : "text-white"}`}>
            <span>{getCategoryEmoji(place.types[0])}</span> {place.name}
          </h3>
          <p className="text-zinc-500 text-xs mt-1">{place.address}</p>
        </div>
        <div className="flex items-center gap-1 text-[#FCD34D] bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/50">
          <Star className="w-4 h-4 fill-current" />
          <span className="font-bold text-sm">{place.rating}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 text-sm font-semibold">
        <div className="flex items-center gap-1.5 text-zinc-300 bg-zinc-800/40 px-3 py-1.5 rounded-full">
          <MapPin className="w-4 h-4 text-[#F472B6]" /> {place.distance} km away
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${place.openNow ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
          <Clock className="w-4 h-4" /> {place.openNow ? "Open Now" : "Closed"}
        </div>
      </div>

      {/* 🔥 NEW: AI EXPLAINABILITY BOX (RECOMMENDED BECAUSE) */}
      <div className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-800/60">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-[#F472B6]" /> Recommended Because
        </p>
        <ul className="space-y-2">
          {getReasons().map((reason, idx) => (
            <li key={idx} className="flex items-center gap-2.5 text-sm font-medium text-zinc-300">
              <span className="text-base">{reason.icon}</span> {reason.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onViewOnMap(); }}
          className="flex-1 bg-[#BE185D] hover:bg-[#9D174D] py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white active:scale-95"
        >
          <Navigation className="w-4 h-4" /> Directions
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(place); }}
          className="px-5 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 active:scale-95"
          style={{
            background: isFav ? "rgba(244,114,182,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isFav ? "rgba(244,114,182,0.4)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          <Heart
            className="w-5 h-5"
            style={{
              fill: isFav ? "#F472B6" : "transparent",
              color: isFav ? "#F472B6" : "#A1A1AA",
              transition: "all 0.3s ease",
            }}
          />
        </button>
      </div>
    </motion.div>
  );
};

// --- MAIN RESULTS COMPONENT ---
const Results = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "high-rated">("all");
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "open">("distance");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState(5);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [greeting, setGreeting] = useState({ text: "", emoji: "" });
  const [userCity, setUserCity] = useState("Detecting...");

  const mood = state?.mood || "Unknown Mood";
  const userLat = state?.lat || 28.367;
  const userLng = state?.lng || 79.4304;
  const [mapCenter, setMapCenter] = useState({ lat: userLat, lng: userLng });

  useEffect(() => {
    setGreeting(getGreeting());

    // Load favorites from local storage
    const saved = localStorage.getItem("favorites");
    if (saved) {
      const parsed: Place[] = JSON.parse(saved);
      setFavorites(parsed.map((p) => p.id));
      setFavCount(parsed.length);
    }

    // Reverse geocode real location
    if (state?.lat && state?.lng) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${state.lat}&lon=${state.lng}&format=json`
      )
        .then((r) => r.json())
        .then((data) => {
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county ||
            "Your City";
          const st = data.address.state || "";
          setUserCity(`${city}, ${st}`);
        })
        .catch(() => setUserCity("Bareilly, UP"));
    }
  }, [state]);

  const toggleFavorite = (place: Place) => {
    const saved = localStorage.getItem("favorites");
    const existing: Place[] = saved ? JSON.parse(saved) : [];
    const alreadySaved = existing.find((p) => p.id === place.id);
    if (alreadySaved) {
      const updated = existing.filter((p) => p.id !== place.id);
      localStorage.setItem("favorites", JSON.stringify(updated));
      setFavorites((prev) => prev.filter((id) => id !== place.id));
      setFavCount((c) => c - 1);
      toast.error("Removed from favorites");
    } else {
      const updated = [...existing, place];
      localStorage.setItem("favorites", JSON.stringify(updated));
      setFavorites((prev) => [...prev, place.id]);
      setFavCount((c) => c + 1);
      toast.success("Saved to favorites! ❤️");
    }
  };

  // --- API INTEGRATION: FETCH REAL DATA FROM BACKEND ---
  useEffect(() => {
    const fetchPlacesFromBackend = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/places", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: userLat,
            longitude: userLng,
            mood: mood,
            radius_km: 15
          }),
        });

        if (!response.ok) {
          throw new Error("Server error fetching places");
        }

        const result = await response.json();
        
        // 🔥 THE FIX: Smartly check if backend sent an Array directly or inside a 'data' object
        const finalData = Array.isArray(result) ? result : (result.data || []);
        
        setPlaces(finalData);
        setFilteredPlaces(finalData);
      } catch (error) {
        console.error("API Error:", error);
        toast.error("Failed to connect to backend engine 🚨");
      } finally {
        setIsLoading(false);
      }
    };

    if (userLat && userLng && mood) {
      fetchPlacesFromBackend();
    }
  }, [userLat, userLng, mood]);

  useEffect(() => {
    let result = [...places];
    if (searchTerm) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filter === "open") result = result.filter((p) => p.openNow);
    else if (filter === "high-rated") result = result.filter((p) => p.rating >= 4.5);
    
    result = result.filter((p) => p.distance <= maxDistance);
    
    // Sort logic
    if (sortBy === "distance") result.sort((a, b) => a.distance - b.distance);
    else if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "open") result.sort((a, b) => (b.openNow ? 1 : 0) - (a.openNow ? 1 : 0));
    
    setFilteredPlaces(result);
  }, [searchTerm, filter, places, maxDistance, sortBy]);

  const sortLabels: Record<string, string> = {
    distance: "📍 Distance",
    rating: "⭐ Rating",
    open: "🟢 Open Now",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-black text-white pb-20 lg:pb-0 overflow-x-hidden"
    >
      {/* Place Detail Drawer */}
      <AnimatePresence>
        {selectedPlace && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPlace(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-zinc-950 border-l border-zinc-800 z-[120] overflow-y-auto shadow-2xl flex flex-col"
            >
              <div className="relative h-72 w-full">
                <img src={selectedPlace.images[0]} alt={selectedPlace.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                <div className="absolute top-6 left-6 z-10 bg-black/80 backdrop-blur-md text-[#46d369] font-black px-3 py-1.5 rounded-lg border border-[#46d369]/30 text-sm shadow-lg flex items-center gap-1">
                  🔥 {getMatchPercentage(selectedPlace)}% Match
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="absolute top-6 right-6 bg-black/50 p-2.5 rounded-full text-white hover:bg-black/80 transition-all z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 flex-1 -mt-10 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-3xl font-bold text-white">{selectedPlace.name}</h2>
                  <div className="flex items-center gap-1 text-[#FCD34D] bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{selectedPlace.rating}</span>
                  </div>
                </div>
                <p className="text-zinc-400 font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#BE185D]" /> {selectedPlace.address}
                </p>
                <div className="flex gap-3 mt-8">
                  <button className="flex-1 bg-zinc-900 border border-zinc-800 py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all font-semibold">
                    <Phone className="w-4 h-4 text-emerald-400" /> Call Now
                  </button>
                  <button className="flex-1 bg-white text-black py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-zinc-200 transition-all">
                    <Car className="w-4 h-4" /> Book Uber
                  </button>
                </div>
                <div className="mt-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-200 border-b border-zinc-800 pb-3">
                    <MessageSquare className="w-5 h-5 text-[#BE185D]" /> Top Reviews
                  </h3>
                  <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[#BE185D] rounded-full flex items-center justify-center font-bold text-lg">V</div>
                      <div>
                        <p className="text-sm font-bold text-zinc-200">Vansh</p>
                        <div className="flex text-[#FCD34D] mt-0.5">
                          {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                        </div>
                      </div>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      "Amazing vibe! The aesthetic is exactly what I was looking for. Will definitely visit again."
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Filters Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
            >
              <button onClick={() => setShowFilters(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-6 h-6 text-[#BE185D]" /> Advanced Filters
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="flex justify-between text-sm font-medium text-zinc-400 mb-4">
                    <span>Maximum Distance</span>
                    <span className="text-[#F472B6]">{maxDistance} km</span>
                  </label>
                  <input
                    type="range" min="1" max="15" step="1"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full accent-[#BE185D]"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-[#BE185D] hover:bg-[#9D174D] py-4 rounded-xl font-bold transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <div className="bg-black/60 backdrop-blur-xl border-b border-zinc-800/50 sticky top-0 z-50 pt-4">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-3 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Greeting + Location */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-[#BE185D]/20 border border-[#BE185D]/50 px-3 py-1.5 rounded-full text-[#FBCFE8] text-xs font-bold uppercase tracking-wider">
                <span>{greeting.emoji}</span>
                <span>{greeting.text}!</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-700/50 px-3 py-1.5 rounded-full text-zinc-300 text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#F472B6]" />
                {userCity}
              </div>
            </div>

            <h1 className="text-3xl font-bold">
              Places for <span className="text-[#F472B6]">"{mood}"</span>
            </h1>
          </div>

          <div className="flex gap-3 w-full md:w-auto items-center">
            <input
              type="text"
              placeholder="Search places..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-3 w-full md:w-64 focus:outline-none focus:border-[#F472B6] placeholder-zinc-500 text-white h-12"
            />
            <div className="relative h-12">
              <button
                onClick={() => setShowSortMenu((p) => !p)}
                className="h-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 flex items-center gap-2 hover:bg-zinc-800 text-zinc-300 text-sm font-medium whitespace-nowrap"
              >
                <ArrowUpDown className="w-4 h-4" /> {sortLabels[sortBy]}
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-44 rounded-xl border shadow-2xl z-50 overflow-hidden"
                    style={{ background: "rgba(20,5,12,0.97)", borderColor: "rgba(200,60,80,0.3)" }}
                  >
                    {(["distance", "rating", "open"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => { setSortBy(s); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-3 text-sm transition-all ${sortBy === s ? "text-[#F472B6] bg-[#BE185D]/10" : "text-zinc-300"}`}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(160,30,60,0.2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = sortBy === s ? "rgba(190,24,93,0.1)" : "transparent")}
                      >
                        {sortLabels[s]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className="h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 flex items-center justify-center hover:bg-zinc-800 text-zinc-300"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            
            <div className="w-px h-8 bg-zinc-800 mx-2 hidden md:block"></div>
            
            <button
              onClick={() => navigate('/favorites')}
              className="h-12 bg-zinc-900/40 border border-zinc-800 rounded-xl px-5 flex items-center justify-center hover:bg-zinc-800 hover:border-[#F472B6]/50 transition-all shadow-lg group relative"
            >
              <Heart className="w-5 h-5 text-[#F472B6] group-hover:fill-[#F472B6] transition-all mr-0 md:mr-2" />
              <span className="font-bold text-white hidden md:block">Favorites</span>
              {favCount > 0 && (
                <span className="absolute -top-2 -right-2 md:static md:mt-0 md:ml-2 bg-[#BE185D] text-white text-[10px] md:text-xs font-black w-5 h-5 md:w-auto md:px-2 md:py-0.5 flex items-center justify-center rounded-full shadow-md">
                  {favCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="max-w-7xl mx-auto px-6 pb-4 flex gap-3 overflow-x-auto">
          {(["all", "open", "high-rated"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-[#BE185D] text-white shadow-[0_0_15px_rgba(190,24,93,0.4)]"
                  : "bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 border border-zinc-800/50"
              }`}
            >
              {f === "all" && "All Places"}
              {f === "open" && "Open Now"}
              {f === "high-rated" && "Top Rated"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Places List */}
          <div className={`space-y-4 ${mobileView === "map" ? "hidden lg:block" : "block"}`}>
            <h2 className="text-xl font-semibold mb-4 text-zinc-200 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#BE185D]" /> {filteredPlaces.length} places found
            </h2>
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((n) => <PlaceSkeleton key={n} />)}</div>
            ) : filteredPlaces.length === 0 ? (
              <p className="text-center text-zinc-400 py-12">No places found matching your criteria.</p>
            ) : (
              <AnimatePresence>
                {filteredPlaces.map((place, i) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    index={i}
                    isFav={favorites.includes(place.id)}
                    isHovered={hoveredPlaceId === place.id}
                    toggleFavorite={toggleFavorite}
                    setHoveredPlaceId={setHoveredPlaceId}
                    onCardClick={() => setSelectedPlace(place)}
                    onViewOnMap={() => {
                      setMapCenter({ lat: place.lat, lng: place.lng });
                      setActiveRoute({ lat: place.lat, lng: place.lng });
                      if (window.innerWidth < 1024) setMobileView("map");
                    }}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-zinc-900 rounded-[2rem] h-[calc(100vh-200px)] lg:h-[650px] overflow-hidden border border-zinc-800 z-0 lg:sticky lg:top-52 shadow-2xl ${
              mobileView === "list" ? "hidden lg:block" : "block"
            }`}
          >
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={14}
              style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <SmartMapController center={mapCenter} activeRoute={activeRoute} userLoc={{ lat: userLat, lng: userLng }} />
              {activeRoute && (
                <Polyline
                  positions={[[userLat, userLng], [activeRoute.lat, activeRoute.lng]]}
                  color="#F472B6" weight={4} opacity={0.7}
                />
              )}
              <Marker position={[userLat, userLng]}>
                <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                  <div className="font-semibold text-slate-900">Your Location</div>
                </Tooltip>
              </Marker>
              {filteredPlaces.map((place) => (
                <Marker
                  key={`map-${place.id}`}
                  position={[place.lat, place.lng]}
                  icon={getCustomIcon(place.types[0], hoveredPlaceId === place.id)}
                  zIndexOffset={hoveredPlaceId === place.id ? 1000 : 0}
                >
                  <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                    <div className="text-slate-900">
                      <strong className="block text-sm">{place.name}</strong>
                      <span className="text-xs text-gray-600">{place.address}</span>
                    </div>
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>
          </motion.div>
        </div>
      </div>

      {/* Mobile View Toggle */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
        <button
          onClick={() => setMobileView(mobileView === "list" ? "map" : "list")}
          className="bg-[#BE185D] text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(190,24,93,0.5)] flex items-center gap-2 active:scale-95 transition-transform"
        >
          {mobileView === "list"
            ? <><MapPin className="w-5 h-5" /> Show Map</>
            : <><List className="w-5 h-5" /> Show List</>
          }
        </button>
      </div>
    </motion.div>
  );
};

export default Results;