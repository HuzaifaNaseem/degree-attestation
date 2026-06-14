/**
 * PublicVerify — no-login degree verification.
 * Anyone can paste a degree hash and check it against the blockchain.
 * Read-only: POST /api/public/verify (no wallet, no gas, no event).
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api         from "../api/axiosClient";
import PublicNav   from "../components/PublicNav";
import ChainStatus from "../components/ChainStatus";

const STATUS = {
  VALID: {
    title: "Authentic Credential",
    sub: "This degree exists on-chain and has not been revoked.",
    ring: "border-emerald-500/40 bg-emerald-500/8",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: "✓", iconBg: "bg-emerald-500/15 text-emerald-400",
  },
  REVOKED: {
    title: "Credential Revoked",
    sub: "This degree was issued but later revoked by the university. Do not accept.",
    ring: "border-amber-500/40 bg-amber-500/8",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: "⚠", iconBg: "bg-amber-500/15 text-amber-400",
  },
  INVALID: {
    title: "Not Found — Possible Fraud",
    sub: "No record of this hash exists on the blockchain. This credential is not authentic.",
    ring: "border-red-500/40 bg-red-500/8",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: "✕", iconBg: "bg-red-500/15 text-red-400",
  },
};

export default function PublicVerify() {
  const [params]  = useSearchParams();
  const [hash,    setHash]    = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function runVerify(value) {
    const degreeHash = value.trim();
    if (!degreeHash) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const { data } = await api.post("/public/verify", { degreeHash });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed. Check the hash format and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Deep-link: scanning a certificate QR opens /verify-degree?hash=… → auto-verify.
  useEffect(() => {
    const q = params.get("hash");
    if (q) {
      setHash(q);
      runVerify(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => { e.preventDefault(); runVerify(hash); };

  const cfg = result?.status ? STATUS[result.status] : null;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicNav />

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)" }} />
      </div>

      <main className="relative max-w-2xl mx-auto px-6 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Verify a Degree</h1>
          <p className="text-muted">
            Paste a degree hash to check its authenticity against the blockchain.
            No account required — this is a free, read-only lookup.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          data-testid="public-verify-form"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="rounded-2xl border border-line bg-surface p-6 mb-6"
        >
          <label htmlFor="hash" className="block text-sm font-medium text-muted mb-2">
            Degree Hash
          </label>
          <input
            id="hash" type="text" required
            data-testid="input-public-hash"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="0x… (64-character hex)"
            className="w-full bg-elevated border border-line text-fg rounded-xl px-4 py-3 text-sm font-mono placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition mb-4"
          />
          <button
            type="submit"
            disabled={loading}
            data-testid="submit-public-verify"
            className="w-full bg-accent text-accent-fg font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? "Querying blockchain…" : "Verify on Blockchain"}
          </button>

          {error && (
            <p data-testid="public-verify-error" className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mt-4">
              {error}
            </p>
          )}
        </motion.form>

        {/* Result */}
        <AnimatePresence mode="wait">
          {result && cfg && (
            <motion.div
              key={result.degreeHash + result.status}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              data-testid="public-verify-result"
              className={`rounded-2xl border-2 p-6 ${cfg.ring}`}
            >
              <div className="flex items-start gap-4 mb-5">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${cfg.iconBg}`}
                >
                  {cfg.icon}
                </motion.div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                      {result.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-fg">{cfg.title}</h3>
                  <p className="text-sm text-muted mt-0.5">{cfg.sub}</p>
                </div>
              </div>

              {result.status !== "INVALID" && (
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-fg/10 pt-4">
                  {result.studentName && (
                    <Field label="Student" value={result.studentName} />
                  )}
                  {result.program && (
                    <Field label="Program" value={result.program} />
                  )}
                  {result.issuedAt && (
                    <Field label="Issued" value={new Date(result.issuedAt * 1000).toLocaleDateString()} />
                  )}
                  {result.graduationDate && (
                    <Field label="Graduation" value={new Date(result.graduationDate * 1000).toLocaleDateString()} />
                  )}
                  {result.issuingUniversity && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-faint uppercase tracking-wide mb-0.5">Issuing Institution</dt>
                      <dd className="font-mono text-xs text-accent/70 break-all">{result.issuingUniversity}</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="border-t border-fg/10 mt-4 pt-3 flex items-center justify-between">
                <p className="text-xs text-faint">
                  Read-only check{result.readTimeMs !== undefined && ` · ${result.readTimeMs}ms`}
                </p>
                <p className="font-mono text-xs text-accent/50">{result.degreeHash.slice(0, 18)}…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer hint */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <ChainStatus variant="badge" />
          <Link to="/" className="text-xs text-muted hover:text-fg transition-colors">← Back to home</Link>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-faint uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="font-semibold text-fg text-sm">{value}</dd>
    </div>
  );
}
