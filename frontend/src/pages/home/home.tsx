import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ChevronDown, Navigation, Loader2, Clock, X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good Afternoon", emoji: "☀️" };
  if (hour < 20) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Good Night", emoji: "🌙" };
};

const typingWords = [
  "cafe...", "gym...", "date night...", "breakfast spot...",
  "chill vibes...", "study place...", "party mode...", "street food...",
];

const moodSuggestions = [
  { label: "Happy", emoji: "😊" },
  { label: "Sad", emoji: "😔" },
  { label: "Relaxed", emoji: "☕" },
  { label: "Party", emoji: "🎉" },
  { label: "Hungry", emoji: "🍔" },
  { label: "Productive", emoji: "📚" },
  { label: "Romantic", emoji: "❤️" },
];

const dropdownMoods = [
  { emoji: "😄", label: "Happy & Energetic" },
  { emoji: "😌", label: "Relaxed & Calm" },
  { emoji: "😢", label: "Sad & Need Comfort" },
  { emoji: "😤", label: "Stressed & Overwhelmed" },
  { emoji: "🥳", label: "Celebratory & Festive" },
  { emoji: "😴", label: "Tired & Low Energy" },
  { emoji: "🤩", label: "Adventurous & Excited" },
  { emoji: "🧘", label: "Mindful & Peaceful" },
  { emoji: "💼", label: "Productive & Focused" },
  { emoji: "❤️", label: "Romantic & Cozy" },
  { emoji: "👨‍👩‍👧", label: "Family Outing" },
  { emoji: "🎉", label: "Party Mode" },
  { emoji: "💸", label: "Budget Conscious" },
  { emoji: "🌙", label: "Late Night Cravings" },
  { emoji: "☕", label: "Need Caffeine" },
  { emoji: "🍕", label: "Hungry & Craving" },
  { emoji: "📚", label: "Study Mode" },
  { emoji: "💪", label: "Fitness Motivated" },
  { emoji: "🎭", label: "Other..." },
];

const bgGifs = [
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif",
  "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
];

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  const ss = time.getSeconds().toString().padStart(2, "0");
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="absolute top-20 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl border"
      style={{
        background: "rgba(20,5,10,0.6)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
      }}
    >
      <Clock className="w-4 h-4" style={{ color: "#F472B6" }} />
      <span className="font-mono text-sm font-bold text-white tracking-widest">
        {hh}:{mm}<span style={{ color: "#F472B6" }}>:{ss}</span>
      </span>
    </motion.div>
  );
};

const HomePage = () => {
  const [mood, setMood] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentGif, setCurrentGif] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [greeting, setGreeting] = useState({ text: "", emoji: "" });
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [userCity, setUserCity] = useState("Detecting location...");

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGreeting(getGreeting());

    const saved = localStorage.getItem("recentMoodSearches");
    if (saved) setRecentSearches(JSON.parse(saved));

    const favs = localStorage.getItem("favorites");
    if (favs) setFavCount(JSON.parse(favs).length);

    // Detect real location
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county ||
            "Your Location";
          const state = data.address.state || "";
          setUserCity(`${city}, ${state}`);
        } catch {
          setUserCity("Bareilly, UP");
        }
      },
      () => setUserCity("Bareilly, UP")
    );
  }, []);

  // Typing animation
  useEffect(() => {
    const currentWord = typingWords[wordIndex];
    const speed = isDeleting ? 50 : 100;
    const pause = 1400;
    const tick = () => {
      if (!isDeleting && displayText === currentWord) {
        typingRef.current = setTimeout(() => setIsDeleting(true), pause);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % typingWords.length);
      } else {
        setDisplayText((prev) =>
          isDeleting ? prev.slice(0, -1) : currentWord.slice(0, prev.length + 1)
        );
        typingRef.current = setTimeout(tick, speed);
      }
    };
    typingRef.current = setTimeout(tick, speed);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [displayText, isDeleting, wordIndex]);

  // GIF rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentGif((prev) => (prev + 1) % bgGifs.length);
        setFadeIn(true);
      }, 600);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Outside click handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveRecentSearch = (query: string) => {
    const existing: string[] = JSON.parse(localStorage.getItem("recentMoodSearches") || "[]");
    const updated = [query, ...existing.filter((q) => q !== query)].slice(0, 5);
    localStorage.setItem("recentMoodSearches", JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const removeRecentSearch = (query: string) => {
    const updated = recentSearches.filter((q) => q !== query);
    localStorage.setItem("recentMoodSearches", JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const handleSearch = (overrideMood?: string) => {
    const searchMood = overrideMood || mood;
    if (!searchMood.trim()) {
      toast.error("Please enter or select your mood");
      return;
    }
    saveRecentSearch(searchMood.trim());
    setIsLoading(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      setIsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.success("Location fetched!");
        navigate("/results", {
          state: {
            mood: searchMood.trim(),
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
        setIsLoading(false);
      },
      () => {
        toast.error("Location denied. Using default.");
        navigate("/results", {
          state: { mood: searchMood.trim(), lat: 28.367, lng: 79.4304 },
        });
        setIsLoading(false);
      }
    );
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#0d0508" }}
    >
      {/* Navbar Removed as per your request */}

      {/* GIF Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${bgGifs[currentGif]})`,
          opacity: fadeIn ? 0.6 : 0,
          transition: "opacity 0.6s ease",
          zIndex: 0,
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(45,10,10,0.65) 0%, rgba(26,10,26,0.65) 50%, rgba(13,13,43,0.65) 100%)", zIndex: 1 }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top left, rgba(120,20,40,0.4) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(80,10,80,0.4) 0%, transparent 55%)", zIndex: 2 }} />
      <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: "rgba(160,30,60,0.22)", zIndex: 2 }} />
      <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: "rgba(100,20,100,0.22)", zIndex: 2, animationDelay: "1.5s" }} />

      <LiveClock />

      {/* Real-time Location Card */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="absolute top-20 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl border"
        style={{
          background: "rgba(20,5,10,0.6)",
          borderColor: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
        }}
      >
        <div className="relative flex items-center justify-center p-2 rounded-full" style={{ background: "rgba(190,24,93,0.2)" }}>
          <div className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: "#F472B6" }} />
          <Navigation className="w-4 h-4 relative z-10" style={{ color: "#F472B6" }} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{userCity}</p>
          <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
            Current Location Detected
          </p>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-3xl w-full text-center relative mt-16" style={{ zIndex: 10 }}>

        {/* Greeting Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 border hover:scale-105 cursor-default transition-all"
          style={{
            background: "rgba(190,24,93,0.2)",
            borderColor: "rgba(244,114,182,0.4)",
            boxShadow: "0 0 20px rgba(190,24,93,0.3)",
          }}
        >
          <span className="text-lg">{greeting.emoji}</span>
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "#FBCFE8" }}>
            {greeting.text}! Ready to explore?
          </span>
        </motion.div>

        {/* Hero Heading */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative mb-12"
        >
          <div className="absolute -inset-10 bg-gradient-to-r from-pink-600 via-purple-600 to-rose-600 rounded-full blur-[80px] opacity-25 animate-pulse pointer-events-none" />
          <h1 className="text-5xl md:text-7xl font-extrabold mb-5 leading-tight relative z-10 tracking-tight">
            <span className="text-white">Discover </span>
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(to right, #f87171, #c084fc, #fb7185)" }}
            >
              Perfect Places
            </span>
            <br />
            <span className="text-white">Around You ✨</span>
          </h1>
          <p className="text-lg md:text-xl font-medium tracking-wide mt-4 relative z-10" style={{ color: "rgba(255,200,200,0.8)" }}>
            Powered by AI & Real-Time Location
          </p>
        </motion.div>

        {/* Search Bar + Dropdown */}
        <div className="relative mb-3" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "rgba(255,150,150,0.5)" }} />
            <input
              type="text"
              placeholder={mood ? "" : displayText || "Describe your mood or vibe..."}
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => { if (e.key === "Enter") { setShowDropdown(false); handleSearch(); } }}
              className="w-full pl-14 pr-14 py-5 text-lg rounded-2xl focus:outline-none transition-all"
              style={{
                background: "rgba(80,10,30,0.6)",
                border: "1px solid rgba(200,60,80,0.35)",
                color: "white",
                backdropFilter: "blur(12px)",
              }}
            />
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="absolute right-5 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
              style={{ color: "rgba(255,150,150,0.6)" }}
            >
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showDropdown ? "rotate-180" : ""}`} />
            </button>
          </div>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl z-50 border shadow-2xl"
                style={{
                  background: "rgba(30,5,12,0.97)",
                  borderColor: "rgba(200,60,80,0.3)",
                  backdropFilter: "blur(20px)",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                <p className="text-xs px-4 pt-3 pb-2 uppercase tracking-widest sticky top-0 bg-black/40 backdrop-blur-md" style={{ color: "rgba(255,150,150,0.5)" }}>
                  How are you feeling?
                </p>
                {dropdownMoods.map(({ emoji, label }) => (
                  <button
                    key={label}
                    onClick={() => { setMood(label); setShowDropdown(false); }}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 text-sm transition-all"
                    style={{ color: "rgba(255,220,220,0.85)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(160,30,60,0.25)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="text-xl">{emoji}</span> {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Searches */}
        <AnimatePresence>
          {recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 text-left"
            >
              <p className="text-xs uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(255,150,150,0.4)" }}>
                🕓 Recent Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <div key={q} className="flex items-center gap-1 group">
                    <button
                      onClick={() => { setMood(q); handleSearch(q); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: "rgba(80,10,30,0.5)",
                        border: "1px solid rgba(160,30,60,0.3)",
                        color: "rgba(255,200,200,0.75)",
                      }}
                    >
                      🔍 {q}
                    </button>
                    <button
                      onClick={() => removeRecentSearch(q)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Mood Chips */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(255,150,150,0.4)" }}>Quick Moods</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {moodSuggestions.map(({ label, emoji }) => (
              <button
                key={label}
                onClick={() => setMood(label)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: mood === label ? "rgba(160,30,60,0.75)" : "rgba(80,10,30,0.55)",
                  border: `1px solid ${mood === label ? "rgba(220,60,90,0.8)" : "rgba(160,30,60,0.3)"}`,
                  color: mood === label ? "white" : "rgba(255,200,200,0.7)",
                  transform: mood === label ? "scale(1.06)" : "scale(1)",
                  backdropFilter: "blur(8px)",
                  transition: "all 0.2s ease",
                }}
              >
                <span className="text-base">{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => handleSearch()}
          disabled={isLoading || !mood.trim()}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-lg font-semibold transition-all"
          style={{
            background: "linear-gradient(to right, #9b1c3a, #7c1d6f)",
            boxShadow: "0 8px 32px rgba(155,28,58,0.5)",
            opacity: isLoading || !mood.trim() ? 0.7 : 1,
            cursor: isLoading || !mood.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? (
            <><Loader2 className="w-6 h-6 animate-spin" /> Searching nearby places...</>
          ) : (
            <><span className="text-xl">🔍</span> Find Perfect Places</>
          )}
        </button>
      </div>
    </div>
  );
};

export default HomePage;