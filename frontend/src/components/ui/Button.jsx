/** Reusable button — themed via semantic tokens. */
const VARIANTS = {
  primary:   "bg-accent text-accent-fg font-bold hover:opacity-90 shadow-lg shadow-accent/20 focus:ring-accent/40",
  success:   "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 focus:ring-emerald-500/40",
  danger:    "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 focus:ring-red-500/40",
  secondary: "bg-elevated text-muted hover:text-fg border border-line hover:border-accent/30 focus:ring-accent/20",
  ghost:     "text-muted hover:bg-fg/5 hover:text-fg focus:ring-fg/10",
};

export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  "data-testid": testId,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
        transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
