/** Centered loading spinner — gold accent. */
export default function Spinner({ size = "md", className = "" }) {
  const sz = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" }[size] || "w-8 h-8";
  return (
    <div className={`flex justify-center items-center py-8 ${className}`}>
      <svg className={`${sz} animate-spin text-accent`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );
}
