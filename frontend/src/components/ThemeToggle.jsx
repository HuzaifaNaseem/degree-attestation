/**
 * ThemeToggle — segmented control for switching between themes.
 * Reads/writes via useTheme().
 *   default → full labels (sidebar footer)
 *   compact → swatch-only pills (top navs)
 */
import { motion } from "framer-motion";
import { THEMES, useTheme } from "../theme/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`rounded-xl bg-elevated border border-line p-1 flex gap-1 ${compact ? "" : "w-full"}`}
      data-testid="theme-toggle"
    >
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            data-testid={`theme-${t.id}`}
            title={t.label}
            aria-label={`${t.label} theme`}
            className={`relative flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
              compact ? "px-2 py-1.5" : "flex-1 px-2 py-1.5"
            }`}
          >
            {active && (
              <motion.span
                layoutId={compact ? "theme-active-compact" : "theme-active"}
                className="absolute inset-0 rounded-lg bg-accent/15 border border-accent/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className="relative w-3 h-3 rounded-full border border-line shrink-0"
              style={{ backgroundColor: t.swatch }}
            />
            {!compact && (
              <span className={`relative ${active ? "text-accent" : "text-muted"}`}>
                {t.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
