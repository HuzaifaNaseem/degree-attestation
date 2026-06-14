/** Surface container — themed via semantic tokens. */
export default function Card({ title, subtitle, children, className = "", bodyClass = "" }) {
  return (
    <div className={`bg-surface rounded-2xl border border-line ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-line">
          {title    && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className={`p-6 ${bodyClass}`}>{children}</div>
    </div>
  );
}
