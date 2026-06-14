import { useEffect } from "react";

const STYLES = {
  success: "bg-emerald-600 shadow-emerald-500/20",
  error:   "bg-red-600 shadow-red-500/20",
  warning: "bg-amber-500 shadow-amber-500/20",
  info:    "bg-accent text-accent-fg",
};

/**
 * Toast — auto-dismissing notification at top-right.
 * @param {{ message: string, type: string, onClose: () => void }} props
 */
export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isInfo = type === "info";

  return (
    <div
      role="alert"
      data-testid="toast"
      className={`fixed top-4 right-4 z-50 ${STYLES[type] ?? STYLES.info}
        ${isInfo ? "text-accent-fg" : "text-white"}
        px-4 py-3 rounded-xl shadow-xl max-w-sm w-full border border-white/10`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-1 text-sm font-medium leading-snug">{message}</span>
        <button
          onClick={onClose}
          aria-label="dismiss"
          className="opacity-70 hover:opacity-100 mt-0.5 shrink-0 text-lg leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
