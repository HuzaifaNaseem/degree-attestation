/**
 * StudentPortal — public self-service credential lookup.
 * A graduate enters their Student/Registration ID to view their credential(s),
 * download the certificate, and open the public verification link.
 * GET /api/public/student/:studentId  (read-only, PII-free).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api         from "../api/axiosClient";
import PublicNav   from "../components/PublicNav";
import Certificate from "../components/Certificate";

function fmt(unix) {
  return unix ? new Date(unix * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default function StudentPortal() {
  const [sid, setSid]         = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [cert, setCert]       = useState(null);

  async function lookup(e) {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      const { data } = await api.get(`/public/student/${encodeURIComponent(sid.trim())}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Lookup failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicNav />
      {cert && <Certificate degree={cert} onClose={() => setCert(null)} />}

      {/* aurora */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[420px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgb(var(--accent) / 0.10), transparent 70%)" }} />
      </div>

      <main className="relative max-w-3xl mx-auto px-6 pt-32 pb-20">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Student Portal</h1>
          <p className="text-muted mt-2">Enter your Student / Registration ID to access your blockchain credential.</p>
        </motion.div>

        <motion.form onSubmit={lookup} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex gap-3 max-w-xl mx-auto mb-8">
          <input
            value={sid} onChange={(e) => setSid(e.target.value)} required
            placeholder="e.g. IU-2026-500"
            data-testid="student-id-input"
            className="flex-1 bg-elevated border border-line text-fg rounded-xl px-4 py-3 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition"
          />
          <button type="submit" disabled={loading}
            className="bg-accent text-accent-fg font-bold px-6 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50">
            {loading ? "…" : "Find"}
          </button>
        </motion.form>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={result.studentId}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {result.count === 0 ? (
                <div className="text-center text-muted py-10">
                  No credential found for <span className="font-mono text-fg">{result.studentId}</span>.
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted text-center">
                    {result.count} credential{result.count > 1 ? "s" : ""} found for <span className="font-mono text-accent">{result.studentId}</span>
                  </p>
                  {result.degrees.map((d) => (
                    <div key={d.degreeHash} className="rounded-2xl border border-line bg-surface p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/25 text-accent text-lg font-bold flex items-center justify-center">
                            {d.studentName?.[0] ?? "?"}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-fg">{d.studentName}</p>
                            <p className="text-sm text-muted">{d.program}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          d.isRevoked ? "bg-red-500/15 text-red-500 border-red-500/30" : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"}`}>
                          {d.isRevoked ? "REVOKED" : "VERIFIED ✓"}
                        </span>
                      </div>
                      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-line pt-4">
                        <div className="flex justify-between"><dt className="text-muted">Graduated</dt><dd className="font-medium">{fmt(d.graduationDate)}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted">Issued</dt><dd className="font-medium">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}</dd></div>
                        <div className="sm:col-span-2 flex justify-between gap-3"><dt className="text-muted shrink-0">Credential hash</dt><dd className="font-mono text-xs text-accent/70 truncate">{d.degreeHash}</dd></div>
                      </dl>
                      <div className="flex flex-wrap gap-3 mt-5">
                        <button onClick={() => setCert({ ...d, universityWallet: d.universityWallet })}
                          className="bg-accent text-accent-fg font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20">
                          📜 View / Download Certificate
                        </button>
                        <Link to={`/verify-degree?hash=${d.degreeHash}`}
                          className="text-sm font-semibold text-accent border border-accent/30 hover:bg-accent/10 rounded-xl px-5 py-2.5 transition-colors">
                          Public verification link →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!result && (
          <p className="text-center text-xs text-faint mt-6">Try a demo ID like <span className="font-mono text-muted">IU-2026-502</span></p>
        )}
      </main>
    </div>
  );
}
