/**
 * Landing — public marketing homepage.
 * Hero · live stats · feature grid · how-it-works · verify CTA · footer.
 * Fully public (no auth). Sets the professional first impression.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PublicNav   from "../components/PublicNav";
import ChainStatus from "../components/ChainStatus";
import FadeIn      from "../components/motion/FadeIn";
import CountUp     from "../components/motion/CountUp";
import { useEffect, useState } from "react";
import api from "../api/axiosClient";

/* ── Static content ───────────────────────────────────────── */
const FEATURES = [
  {
    title: "Tamper-Proof by Design",
    desc: "Every credential is hashed with keccak256 and anchored to a private Ethereum network. Records cannot be altered or forged.",
    icon: (p) => <path {...p} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  },
  {
    title: "Privacy First (AES-256)",
    desc: "Sensitive data like national IDs is AES-256 encrypted in MongoDB. Only the non-reversible hash ever touches the blockchain.",
    icon: (p) => <path {...p} strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
  },
  {
    title: "Instant Verification",
    desc: "Anyone can verify a degree's authenticity in seconds — no phone calls, no emails, no waiting on the university registrar.",
    icon: (p) => <path {...p} strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />,
  },
  {
    title: "Role-Based Access",
    desc: "On-chain AccessControl enforces who can issue, verify, and revoke. Every wallet's role is re-checked on the blockchain itself.",
    icon: (p) => <path {...p} strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  },
  {
    title: "Complete Audit Trail",
    desc: "Issuance, verification, revocation, and fraud attempts all emit on-chain events and an append-only audit log. Nothing is hidden.",
    icon: (p) => <path {...p} strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  },
  {
    title: "Fraud Detection",
    desc: "Any attempt to verify a credential that was never issued is automatically flagged, logged, and surfaced on the admin dashboard.",
    icon: (p) => <path {...p} strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  },
];

const STEPS = [
  { n: "01", title: "University Issues", desc: "The university signs a transaction; the contract computes and stores the credential hash on-chain." },
  { n: "02", title: "Student Receives",  desc: "The graduate receives their unique degree hash — a portable, verifiable proof of their credential." },
  { n: "03", title: "Anyone Verifies",   desc: "Employers paste the hash to instantly confirm authenticity against the blockchain — VALID, REVOKED, or INVALID." },
];

/* ── Hero stats (live + trust) ────────────────────────────── */
function HeroStats() {
  const [onChain, setOnChain] = useState(0);

  useEffect(() => {
    api.get("/public/chain-status")
      .then(({ data }) => { if (data.online) setOnChain(data.totalIssued); })
      .catch(() => {});
  }, []);

  const stats = [
    { value: onChain, suffix: "", label: "Degrees On-Chain" },
    { value: 100,     suffix: "%", label: "Tamper-Proof" },
    { value: 256,     suffix: "-bit", label: "AES Encryption" },
    { value: 2,       suffix: "s", label: "Avg Verify Time" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-line bg-line">
      {stats.map((s) => (
        <div key={s.label} className="bg-bg px-5 py-6 text-center">
          <p className="text-3xl font-extrabold text-accent">
            <CountUp value={s.value} suffix={s.suffix} />
          </p>
          <p className="text-xs text-muted mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-fg overflow-x-hidden">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="relative pt-36 pb-24 px-6">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(circle, rgba(201,168,76,0.10) 0%, transparent 70%)" }} />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-xs font-medium text-accent">Live on a Private Ethereum Network</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Academic credentials,<br />
            <span style={{
              background: "linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-soft)) 50%, rgb(var(--accent)) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              verified on the blockchain.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A tamper-proof system for issuing, verifying, and revoking degree credentials —
            with privacy-preserving encryption and a complete, immutable audit trail.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              to="/verify-degree"
              className="w-full sm:w-auto bg-accent text-accent-fg font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-accent/25 hover:scale-[1.03]"
            >
              Verify a Degree →
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-elevated text-fg font-semibold px-7 py-3.5 rounded-xl border border-line hover:border-accent/40 transition-all"
            >
              Institution Sign In
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="max-w-3xl mx-auto"
          >
            <HeroStats />
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative py-24 px-6 border-t border-line-soft">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">Why DegreeAttest</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">Built for trust, privacy, and speed</h2>
            <p className="text-muted max-w-2xl mx-auto">
              Every design decision serves one goal: making academic fraud impossible while keeping personal data private.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="h-full rounded-2xl border border-line bg-surface p-6 hover:border-accent/30 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      {f.icon({})}
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-fg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative py-24 px-6 border-t border-line-soft">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">From issuance to verification</h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.1}>
                <div className="relative rounded-2xl border border-line bg-surface p-7 h-full">
                  <span className="text-5xl font-extrabold text-accent/15">{s.n}</span>
                  <h3 className="text-lg font-bold text-fg mt-2 mb-2">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 text-accent/40 text-xl">→</div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── VERIFY CTA ── */}
      <section id="verify" className="relative py-24 px-6 border-t border-line-soft">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <FadeIn>
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">Public verification</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
              Check any degree's authenticity — instantly, no account needed.
            </h2>
            <p className="text-muted mb-8 leading-relaxed">
              Paste a degree hash and our system queries the blockchain in real time.
              You'll see whether the credential is valid, revoked, or was never issued —
              a read-only check that costs nothing and reveals no personal data.
            </p>
            <Link
              to="/verify-degree"
              className="inline-block bg-accent text-accent-fg font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-accent/25 hover:scale-[1.03]"
            >
              Open the Verifier →
            </Link>
          </FadeIn>

          <FadeIn delay={0.1}>
            <ChainStatus variant="card" />
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-line-soft py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg className="w-4 h-4 text-accent-fg" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="text-fg font-bold text-sm leading-none">DegreeAttest</p>
              <p className="text-faint text-xs mt-0.5">Blockchain Degree Attestation</p>
            </div>
          </div>
          <p className="text-faint text-xs text-center">
            BSCS Capstone Project · Iqra University · CLO3 · SDG 4 &amp; 9
          </p>
          <ChainStatus variant="badge" />
        </div>
      </footer>
    </div>
  );
}
