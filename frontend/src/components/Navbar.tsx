import { NavLink } from "react-router-dom";
import { Home, List, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface NavbarProps {
  favCount?: number;
}

const Navbar = ({ favCount = 0 }: NavbarProps) => {
  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-6 py-3"
      style={{
        background: "rgba(10,3,6,0.80)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(190,24,93,0.15)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">📍</span>
        <span className="font-extrabold text-white tracking-tight text-lg">
          Mood<span style={{ color: "#F472B6" }}>Map</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-[#BE185D]/20 text-[#F472B6] border border-[#BE185D]/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`
          }
        >
          <Home className="w-4 h-4" /> Home
        </NavLink>

        <NavLink
          to="/results"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-[#BE185D]/20 text-[#F472B6] border border-[#BE185D]/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`
          }
        >
          <List className="w-4 h-4" /> Results
        </NavLink>

        <NavLink
          to="/favorites"
          className={({ isActive }) =>
            `relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-[#BE185D]/20 text-[#F472B6] border border-[#BE185D]/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`
          }
        >
          <Heart className="w-4 h-4" /> Favorites
          {favCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ background: "#BE185D" }}
            >
              {favCount > 9 ? "9+" : favCount}
            </span>
          )}
        </NavLink>
      </div>
    </motion.nav>
  );
};

export default Navbar;