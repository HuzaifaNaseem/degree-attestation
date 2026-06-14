/** Centered empty-state placeholder — dark theme. */
export default function EmptyState({ title = "No data", message, icon = "📭" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3 opacity-50">{icon}</span>
      <p className="text-sm font-semibold text-muted">{title}</p>
      {message && <p className="text-xs text-faint mt-1 max-w-xs">{message}</p>}
    </div>
  );
}
