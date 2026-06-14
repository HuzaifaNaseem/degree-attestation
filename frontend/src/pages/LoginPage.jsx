/**
 * LoginPage — premium split-screen dark design.
 * Left: charcoal branded panel with gold accents.
 * Right: dark form panel.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api    from "../api/axiosClient";
import Button from "../components/ui/Button";
import FormField, { inputCls } from "../components/ui/FormField";

const FEATURES = [
  { icon: "⛓", title: "Blockchain-Anchored",  desc: "Every credential is hashed on a private Ethereum network — tamper-proof by design." },
  { icon: "🔒", title: "Privacy First",         desc: "Sensitive data is AES-256 encrypted in MongoDB. Only the keccak256 hash lives on-chain." },
  { icon: "⚡", title: "Instant Verification",  desc: "Employers verify any degree in seconds without contacting the university." },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user",  JSON.stringify(data.user));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-bg">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-sidebar flex-col justify-between p-14 relative overflow-hidden border-r border-line-soft">

        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-x-1/3 translate-y-1/3"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)" }} />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shadow-xl shadow-accent/30">
              <svg className="w-6 h-6 text-accent-fg" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="text-fg font-bold text-lg leading-none">DegreeAttest</p>
              <p className="text-faint text-xs mt-0.5">Iqra University · Blockchain CCP</p>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-[2.6rem] font-extrabold text-fg leading-[1.15] mb-5 tracking-tight">
            Academic Credentials<br />
            <span style={{
              background: "linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-soft)) 50%, rgb(var(--accent)) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              on the Blockchain.
            </span>
          </h1>
          <p className="text-muted text-base leading-relaxed mb-12 max-w-md">
            A private Ethereum network for issuing, verifying, and revoking
            degree credentials — with a complete immutable audit trail.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-lg shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-fg text-sm font-semibold">{title}</p>
                  <p className="text-faint text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-faint text-xs">
          BSCS Capstone Project · CLO3 · SDG 4 & 9
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-[360px]">

          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3 shadow-lg shadow-accent/30">
              <svg className="w-7 h-7 text-accent-fg" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-fg">DegreeAttest</h2>
          </div>

          <h2 className="text-2xl font-bold text-fg mb-1">Welcome back</h2>
          <p className="text-sm text-muted mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-4">
            <FormField label="Email address" required htmlFor="email">
              <input
                id="email" type="email" required
                data-testid="input-email"
                value={form.email} onChange={set("email")}
                autoComplete="email"
                placeholder="you@iqra.edu.pk"
                className={inputCls}
              />
            </FormField>

            <FormField label="Password" required htmlFor="password">
              <input
                id="password" type="password" required
                data-testid="input-password"
                value={form.password} onChange={set("password")}
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputCls}
              />
            </FormField>

            {error && (
              <div
                data-testid="login-error"
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              data-testid="submit-login"
              className="w-full py-3 text-base"
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-faint mt-8 leading-relaxed">
            Role is determined by your registered account.<br />
            Contact the platform admin to get access.
          </p>

          {/* Dev hint */}
          <div className="mt-6 p-4 rounded-xl bg-surface border border-line">
            <p className="text-xs font-bold text-faint mb-2.5 uppercase tracking-widest">Test Accounts</p>
            <div className="space-y-1.5 text-xs font-mono">
              <p><span className="text-accent font-bold">admin</span><span className="text-faint"> · admin@iqra.edu.pk / Admin@1234</span></p>
              <p><span className="text-violet-400 font-bold">uni</span><span className="text-faint"> · university@iqra.edu.pk / University@1234</span></p>
              <p><span className="text-emerald-400 font-bold">emp</span><span className="text-faint"> · employer@techcorp.com / Employer@1234</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
