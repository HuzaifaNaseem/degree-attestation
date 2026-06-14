/**
 * FormField — label + input/select wrapper. Themed via semantic tokens.
 */
export default function FormField({
  label,
  hint,
  error,
  required = false,
  children,
  htmlFor,
  className = "",
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-muted">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-xs text-faint">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Shared className for all inputs and selects. */
export const inputCls =
  "w-full bg-elevated border border-line text-fg rounded-xl px-3.5 py-2.5 text-sm " +
  "placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/40 " +
  "focus:border-accent/60 transition disabled:opacity-40 disabled:cursor-not-allowed";
