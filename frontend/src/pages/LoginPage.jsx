/**
 * LoginPage — centered glass card over an animated aurora background.
 * A deliberately distinct layout (no split-screen) for the Attestify identity.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api    from "../api/axiosClient";
import Button from "../components/ui/Button";
import FormField, { inputCls } from "../components/ui/FormField";
import { LogoMark } from "../components/Logo";

const DEMO = [
  { role: "Admin",      email: "admin@iqra.edu.pk",       pass: "Admin@1234" },
  { role: "University", email: "university@iqra.edu.pk",  pass: "University@1234" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "student" ? "/my-credentials" : "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg px-4 py-10">
      {/* ── Animated aurora background ── */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 -left-32 w-[480px] h-[480px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgb(var(--accent) / 0.30), transparent 70%)" }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-48 -right-24 w-[560px] h-[560px] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, rgb(var(--accent-soft) / 0.22), transparent 70%)" }}
          animate={{ x: [0, -40, 0], y: [0, -40, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "linear-gradient(rgb(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--accent)) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <LogoMark size={58} />
          <h1 className="text-2xl font-extrabold text-fg mt-4 tracking-tight">Attestify</h1>
          <p className="text-sm text-muted mt-1">Blockchain Credential Platform</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-line bg-surface/80 backdrop-blur-xl p-7 shadow-2xl">
          <h2 className="text-lg font-bold text-fg">Welcome back</h2>
          <p className="text-sm text-muted mb-6">Sign in to your institution dashboard.</p>

          <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-4">
            <FormField label="Email address" required htmlFor="email">
              <input
                id="email" type="email" required
                data-testid="input-email"
                value={form.email} onChange={set("email")}
                autoComplete="email" placeholder="you@institution.edu"
                className={inputCls}
              />
            </FormField>

            <FormField label="Password" required htmlFor="password">
              <input
                id="password" type="password" required
                data-testid="input-password"
                value={form.password} onChange={set("password")}
                autoComplete="current-password" placeholder="••••••••"
                className={inputCls}
              />
            </FormField>

            {error && (
              <div data-testid="login-error"
                className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} data-testid="submit-login" className="w-full py-3 text-base">
              {loading ? "Signing in…" : "Sign In →"}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-line">
            <p className="text-[11px] font-bold uppercase tracking-widest text-faint mb-2.5">Demo Accounts — click to fill</p>
            <div className="grid gap-1.5">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => setForm({ email: d.email, password: d.pass })}
                  className="flex items-center justify-between rounded-lg bg-elevated border border-line px-3 py-2 text-left hover:border-accent/40 transition-colors"
                >
                  <span className="text-xs font-semibold text-fg">{d.role}</span>
                  <span className="text-[11px] font-mono text-muted truncate ml-2">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Student signup + public verify + trust line */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-muted">
            Are you a graduate? <Link to="/student-signup" className="text-accent hover:underline font-semibold">Create a student account</Link>
          </p>
          <Link to="/verify-degree" className="text-sm text-accent hover:underline block">
            Verify a credential without signing in →
          </Link>
          <p className="text-xs text-faint">Secured by Ethereum · AES-256 encryption · BSCS Capstone</p>
        </div>
      </motion.div>
    </div>
  );
}
