/**
 * Attestify brand mark — a shield + checkmark (trust / verified).
 * <LogoMark/> = icon badge only.  <Logo/> = mark + "Attestify" wordmark.
 * The badge uses the themed accent so it adapts to dark/light.
 */
export function LogoMark({ size = 36, className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-soft)) 100%)",
        boxShadow: "0 6px 16px rgb(var(--accent) / 0.35)",
      }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none"
        stroke="rgb(var(--accent-fg))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29Z" />
      </svg>
    </span>
  );
}

export default function Logo({ size = 36, sub, className = "", textClass = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <div className="min-w-0 leading-none">
        <p className={`font-bold tracking-tight ${textClass || "text-fg text-base"}`}>
          Attestify
        </p>
        {sub && <p className="text-[11px] text-faint mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
