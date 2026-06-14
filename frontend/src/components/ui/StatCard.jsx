/** Gradient stat card — Gold × Charcoal design system. */
import { motion } from "framer-motion";
import CountUp from "../motion/CountUp";

const THEMES = {
  blue:   { grad: "from-[#C9A84C] to-[#8B6914]",     icon: "bg-[#C9A84C]/25",   shadow: "shadow-[#C9A84C]/20"   },
  green:  { grad: "from-emerald-500 to-emerald-700",  icon: "bg-emerald-400/25", shadow: "shadow-emerald-500/20" },
  red:    { grad: "from-red-500 to-red-700",           icon: "bg-red-400/25",     shadow: "shadow-red-500/20"     },
  amber:  { grad: "from-amber-500 to-amber-700",       icon: "bg-amber-400/25",   shadow: "shadow-amber-500/20"   },
  purple: { grad: "from-violet-500 to-violet-700",     icon: "bg-violet-400/25",  shadow: "shadow-violet-500/20"  },
  gray:   { grad: "from-[#1A1E2A] to-[#252A3A]",      icon: "bg-white/10",       shadow: "shadow-black/20"       },
};

export default function StatCard({ label, value, color = "blue", icon, loading = false }) {
  const t = THEMES[color] ?? THEMES.blue;
  const isNumeric = typeof value === "number";

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={`rounded-2xl bg-gradient-to-br ${t.grad} shadow-xl ${t.shadow} p-5 text-white`}
    >
      <div className="flex items-start justify-between">
        <div>
          {loading ? (
            <div className="h-10 w-16 bg-white/20 rounded-lg animate-pulse mb-2" />
          ) : (
            <p className="text-4xl font-extrabold tracking-tight">
              {isNumeric ? <CountUp value={value} duration={1.1} /> : (value ?? "—")}
            </p>
          )}
          <p className="text-sm font-medium text-white/70 mt-1">{label}</p>
        </div>
        {icon && (
          <div className={`${t.icon} rounded-xl w-12 h-12 flex items-center justify-center text-2xl backdrop-blur-sm`}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
