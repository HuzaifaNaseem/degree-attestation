/**
 * Explorer — public, no-login transparency page (Etherscan-style).
 * Live aggregate counts + a feed of recent on-chain events. PII-free.
 * Data: GET /api/public/stats  (+ ChainStatus widget).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api          from "../api/axiosClient";
import PublicNav    from "../components/PublicNav";
import ChainStatus  from "../components/ChainStatus";
import CountUp      from "../components/motion/CountUp";
import FadeIn       from "../components/motion/FadeIn";

const EVENT_META = {
  DEGREE_ISSUED:       { label: "Issued",       cls: "bg-accent/15 text-accent border-accent/30" },
  DEGREE_VERIFIED:     { label: "Verified",     cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  PUBLIC_VERIFY:       { label: "Verified",     cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  DEGREE_REVOKED:      { label: "Revoked",      cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  FRAUD_ATTEMPT:       { label: "Fraud Flag",   cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  ROLE_GRANTED:        { label: "Role Granted", cls: "bg-violet-500/15 text-violet-500 border-violet-500/30" },
  AUTH_LOGIN:          { label: "Login",        cls: "bg-fg/5 text-muted border-line" },
  UNAUTHORIZED_ACCESS: { label: "Blocked",      cls: "bg-red-500/15 text-red-500 border-red-500/30" },
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const SEPOLIA_TX = "https://sepolia.etherscan.io/tx/";

export default function Explorer() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () => api.get("/public/stats")
      .then(({ data }) => { if (alive) { setData(data); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    load();
    const id = setInterval(load, 10000); // live refresh
    return () => { alive = false; clearInterval(id); };
  }, []);

  const stats = [
    { label: "Credentials On-Chain", value: data?.totalOnChain ?? 0,       color: "text-accent" },
    { label: "Verifications",        value: data?.totalVerifications ?? 0, color: "text-emerald-500" },
    { label: "Revoked",              value: data?.totalRevoked ?? 0,       color: "text-amber-600" },
    { label: "Fraud Attempts",       value: data?.totalFraud ?? 0,         color: "text-red-500" },
  ];

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicNav />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Credential Explorer</h1>
            <p className="text-muted mt-2 max-w-xl">
              A live, public window into the Attestify network — every credential and verification,
              recorded transparently on the Ethereum blockchain.
            </p>
          </div>
          <ChainStatus variant="badge" />
        </motion.div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.05}>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className={`text-4xl font-extrabold ${s.color}`}>
                  <CountUp value={s.value} />
                </p>
                <p className="text-xs text-muted mt-1">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Live feed */}
        <FadeIn>
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 className="text-sm font-semibold">Recent Network Activity</h2>
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live · auto-refresh
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-muted text-sm">Loading network activity…</div>
            ) : !data?.recent?.length ? (
              <div className="p-10 text-center text-muted text-sm">No on-chain activity yet.</div>
            ) : (
              <div className="divide-y divide-line-soft">
                {data.recent.map((e, i) => {
                  const meta = EVENT_META[e.eventType] || { label: e.eventType, cls: "bg-fg/5 text-muted border-line" };
                  return (
                    <div key={i} className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-elevated transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${meta.cls}`}>
                          {meta.label}
                        </span>
                        <span className="font-mono text-xs text-muted truncate">
                          {e.actor ? `${e.actor.slice(0, 10)}…` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {e.txHash && (
                          <a href={SEPOLIA_TX + e.txHash} target="_blank" rel="noreferrer"
                            className="font-mono text-xs text-accent hover:underline">
                            {e.txHash.slice(0, 10)}… ↗
                          </a>
                        )}
                        <span className="text-xs text-faint w-16 text-right">{timeAgo(e.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </FadeIn>

        <div className="text-center mt-8">
          <Link to="/verify-degree" className="text-sm text-accent hover:underline">Verify a specific credential →</Link>
        </div>
      </main>
    </div>
  );
}
