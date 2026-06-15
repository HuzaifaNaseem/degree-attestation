/**
 * Apply — public attestation request form.
 * Applicants submit a request → it enters the institution's review queue.
 * POST /api/requests (public). Our own layout (centered card on aurora bg).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api        from "../api/axiosClient";
import PublicNav  from "../components/PublicNav";
import Button     from "../components/ui/Button";
import FormField, { inputCls } from "../components/ui/FormField";

const INITIAL = { applicantName: "", studentId: "", program: "", graduationDate: "", email: "", nationalId: "" };

export default function Apply() {
  const [form, setForm]       = useState(INITIAL);
  const [done, setDone]       = useState(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/requests", {
        ...form,
        graduationDate: Math.floor(new Date(form.graduationDate).getTime() / 1000),
      });
      setDone(data.request);
    } catch (err) {
      setError(err.response?.data?.error || "Could not submit your application. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicNav />
      <main className="max-w-2xl mx-auto px-6 pt-32 pb-20">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-line bg-surface p-8 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
            <h1 className="text-2xl font-bold">Application Submitted</h1>
            <p className="text-muted mt-2">Your attestation request is now in the institution's review queue.</p>
            <div className="mt-6 rounded-xl bg-elevated border border-line p-4 text-left text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted">Reference</span><span className="font-mono text-accent">{done._id?.slice(-8).toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-muted">Applicant</span><span className="font-semibold">{done.applicantName}</span></div>
              <div className="flex justify-between"><span className="text-muted">Program</span><span className="font-semibold">{done.program}</span></div>
              <div className="flex justify-between"><span className="text-muted">Attestation fee</span><span className="font-semibold">Rs. {done.fee?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">PENDING REVIEW</span></div>
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={() => { setForm(INITIAL); setDone(null); }} className="text-sm font-semibold text-accent hover:underline">Submit another</button>
              <Link to="/" className="text-sm text-muted hover:text-fg">← Home</Link>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Apply for Degree Attestation</h1>
              <p className="text-muted mt-2">Submit your details to request a blockchain-verified credential. An institution reviewer will approve and issue it on-chain.</p>
            </motion.div>

            <motion.form
              onSubmit={submit} data-testid="apply-form"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-2xl border border-line bg-surface p-7 space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Full Name" required htmlFor="an">
                  <input id="an" required value={form.applicantName} onChange={set("applicantName")} placeholder="e.g. Ayesha Tariq" className={inputCls} />
                </FormField>
                <FormField label="Student / Registration ID" required htmlFor="sid">
                  <input id="sid" required value={form.studentId} onChange={set("studentId")} placeholder="e.g. IU-2026-101" className={inputCls} />
                </FormField>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Degree Program" required htmlFor="prog">
                  <input id="prog" required value={form.program} onChange={set("program")} placeholder="e.g. BS Computer Science" className={inputCls} />
                </FormField>
                <FormField label="Graduation Date" required htmlFor="gd">
                  <input id="gd" type="date" required value={form.graduationDate} onChange={set("graduationDate")} className={inputCls} />
                </FormField>
              </div>
              <FormField label="Email" required htmlFor="em">
                <input id="em" type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} />
              </FormField>
              <FormField label="National ID / CNIC" hint="Encrypted (AES-256) — never stored on-chain" required htmlFor="nid">
                <input id="nid" required value={form.nationalId} onChange={set("nationalId")} placeholder="42101-1234567-1" className={inputCls} />
              </FormField>

              {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted">Fee is calculated on submission (Bachelor Rs.3,000 · Master/PhD Rs.6,000).</p>
                <Button type="submit" loading={loading} data-testid="submit-apply">
                  {loading ? "Submitting…" : "Submit Application →"}
                </Button>
              </div>
            </motion.form>
          </>
        )}
      </main>
    </div>
  );
}
