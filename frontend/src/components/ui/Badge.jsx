/**
 * Badge — inline status pill. Semi-transparent fills read on any theme.
 */
const STYLES = {
  valid:   "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
  invalid: "bg-red-500/15 text-red-500 border border-red-500/30",
  revoked: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
  fraud:   "bg-red-500/20 text-red-500 border border-red-500/40 font-bold",
  info:    "bg-accent/15 text-accent border border-accent/30",
  warning: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
  neutral: "bg-fg/5 text-muted border border-line",
  purple:  "bg-violet-500/15 text-violet-500 border border-violet-500/30",
};

export default function Badge({ variant = "neutral", children, size = "sm", className = "" }) {
  const padding = size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} ${STYLES[variant] ?? STYLES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
