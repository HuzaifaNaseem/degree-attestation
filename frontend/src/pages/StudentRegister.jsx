/**
 * StudentRegister — public student self-registration.
 * Creates a student account linked by Student ID, then auto-logs in and lands
 * on the private "My Credentials" page.
 * POST /api/auth/student-register → POST /api/auth/login
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api    from "../api/axiosClient";
import Button from "../components/ui/Button";
import FormField, { inputCls } from "../components/ui/FormField";
import { LogoMark } from "../components/Logo";

export default function StudentRegister() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: "", email: "", password: "", studentId: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.post("/auth/student-register", form);
      // auto login
      const { data } = await api.post("/auth/login", { email: form.email, password: form.password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/my-credentials", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <motion.div className="absolute -top-40 -left-32 w-[480px] h-[480px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgb(var(--accent) / 0.30), transparent 70%)" }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-48 -right-24 w-[560px] h-[560px] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, rgb(var(--accent-soft) / 0.22), transparent 70%)" }}
          animate={{ x: [0, -40, 0], y: [0, -40, 0] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <LogoMark size={56} />
          <h1 className="text-2xl font-extrabold text-fg mt-4 tracking-tight">Create your student account</h1>
          <p className="text-sm text-muted mt-1">Access and share your blockchain credential.</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface/80 backdrop-blur-xl p-7 shadow-2xl">
          <form onSubmit={submit} data-testid="student-register-form" className="space-y-4">
            <FormField label="Full Name" required htmlFor="sn">
              <input id="sn" required value={form.name} onChange={set("name")} placeholder="e.g. Ayesha Tariq" className={inputCls} />
            </FormField>
            <FormField label="Student / Registration ID" hint="Must match the ID on your credential" required htmlFor="sid">
              <input id="sid" required value={form.studentId} onChange={set("studentId")} placeholder="e.g. IU-2026-502" className={inputCls} />
            </FormField>
            <FormField label="Email" required htmlFor="se">
              <input id="se" type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} />
            </FormField>
            <FormField label="Password" required htmlFor="sp">
              <input id="sp" type="password" required value={form.password} onChange={set("password")} placeholder="Min 6 characters" className={inputCls} />
            </FormField>

            {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>}

            <Button type="submit" loading={loading} data-testid="submit-student-register" className="w-full py-3 text-base">
              {loading ? "Creating account…" : "Create account →"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account? <Link to="/login" className="text-accent hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
