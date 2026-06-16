/**
 * Apply — public attestation application.
 * Applicants submit their details AND upload supporting documents (CNIC, payment
 * proof, matric & intermediate marksheets). Each document is compressed and OCR'd
 * in the browser (Tesseract.js) before it's sent, so the request carries both the
 * image and the extracted text for the reviewer + AI agent. POST /api/requests (public).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api        from "../api/axiosClient";
import PublicNav  from "../components/PublicNav";
import Button     from "../components/ui/Button";
import FormField, { inputCls } from "../components/ui/FormField";
import { compressImage, ocrImage } from "../lib/docScan";

const INITIAL = { applicantName: "", studentId: "", program: "", graduationDate: "", email: "", nationalId: "" };

// Real program catalog with attestation fees (must match the backend PROGRAM_FEES table).
const PROGRAMS = [
  { value: "BS Computer Science", fee: 3000 },
  { value: "BS Software Engineering", fee: 3000 },
  { value: "BS Artificial Intelligence", fee: 3000 },
  { value: "BS Information Technology", fee: 3000 },
  { value: "BS Electrical Engineering", fee: 3000 },
  { value: "BS Accounting & Finance", fee: 3000 },
  { value: "BBA (Bachelor of Business Administration)", fee: 3000 },
  { value: "MS Computer Science", fee: 6000 },
  { value: "MS Data Science", fee: 6000 },
  { value: "MBA (Master of Business Administration)", fee: 6000 },
  { value: "MPhil Computer Science", fee: 6000 },
  { value: "PhD Computer Science", fee: 6000 },
];

// Pakistani CNIC → 13 digits formatted 00000-0000000-0 (digits only, capped at 13).
const formatCnic = (raw) => {
  const d = String(raw).replace(/\D/g, "").slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12, 13)].filter(Boolean).join("-");
};

// The supporting documents we collect for attestation.
const DOC_SLOTS = [
  { type: "cnic",         label: "CNIC / National ID",      hint: "Front of your ID card" },
  { type: "payment",      label: "Payment Proof",           hint: "Fee deposit slip / receipt" },
  { type: "matric",       label: "Matriculation Marksheet", hint: "SSC / Grade 10 result" },
  { type: "intermediate", label: "Intermediate Marksheet",  hint: "HSSC / Grade 12 result" },
];

export default function Apply() {
  const [form, setForm]       = useState(INITIAL);
  const [docs, setDocs]       = useState({});   // { [type]: {label,dataUrl,mime,ocrText,status,progress} }
  const [done, setDone]       = useState(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Derived: selected program fee + live CNIC validity
  const fee        = PROGRAMS.find((p) => p.value === form.program)?.fee ?? null;
  const cnicDigits = form.nationalId.replace(/\D/g, "");
  const cnicValid  = cnicDigits.length === 13;

  async function handleFile(slot, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setDocs((d) => ({ ...d, [slot.type]: { label: slot.label, status: "error", error: "Please upload an image (JPG/PNG)." } }));
      return;
    }
    // 1) compress for storage, show preview immediately
    const { dataUrl, mime } = await compressImage(file);
    setDocs((d) => ({ ...d, [slot.type]: { label: slot.label, dataUrl, mime, ocrText: "", status: "scanning", progress: 0 } }));
    // 2) OCR in the browser
    try {
      const text = await ocrImage(dataUrl, (pct) =>
        setDocs((d) => ({ ...d, [slot.type]: { ...d[slot.type], progress: pct } }))
      );
      setDocs((d) => ({ ...d, [slot.type]: { ...d[slot.type], ocrText: text, status: "done", progress: 100 } }));
    } catch {
      setDocs((d) => ({ ...d, [slot.type]: { ...d[slot.type], status: "done", ocrText: "", error: "Text scan failed — image still attached." } }));
    }
  }

  function removeDoc(type) {
    setDocs((d) => { const n = { ...d }; delete n[type]; return n; });
  }

  const scanning = Object.values(docs).some((d) => d.status === "scanning");
  const attachedCount = Object.values(docs).filter((d) => d.dataUrl).length;
  const allDocsAttached = DOC_SLOTS.every((s) => docs[s.type]?.dataUrl);

  async function submit(e) {
    e.preventDefault();
    if (!allDocsAttached) { setError("Please upload all four documents before submitting."); return; }
    if (!cnicValid) { setError("Enter a valid 13-digit CNIC."); return; }
    setError(""); setLoading(true);
    try {
      const documents = DOC_SLOTS
        .filter((s) => docs[s.type]?.dataUrl)
        .map((s) => ({
          type: s.type, label: s.label,
          mime: docs[s.type].mime, dataUrl: docs[s.type].dataUrl, ocrText: docs[s.type].ocrText || "",
        }));
      const { data } = await api.post("/requests", {
        ...form,
        graduationDate: Math.floor(new Date(form.graduationDate).getTime() / 1000),
        documents,
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
              <div className="flex justify-between"><span className="text-muted">Documents</span><span className="font-semibold">{attachedCount} attached</span></div>
              <div className="flex justify-between"><span className="text-muted">Attestation fee</span><span className="font-semibold">Rs. {done.fee?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">PENDING REVIEW</span></div>
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={() => { setForm(INITIAL); setDocs({}); setDone(null); }} className="text-sm font-semibold text-accent hover:underline">Submit another</button>
              <Link to="/" className="text-sm text-muted hover:text-fg">← Home</Link>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Apply for Degree Attestation</h1>
              <p className="text-muted mt-2">Fill in your details and upload your documents. They're scanned (OCR) in your browser, then reviewed before the credential is issued on-chain.</p>
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
                  <select id="prog" required value={form.program} onChange={set("program")} className={inputCls}>
                    <option value="" disabled>Select your degree…</option>
                    {PROGRAMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.value} — Rs. {p.fee.toLocaleString()}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Graduation Date" required htmlFor="gd">
                  <input id="gd" type="date" required value={form.graduationDate} onChange={set("graduationDate")} className={inputCls} />
                </FormField>
              </div>
              <FormField label="Email" required htmlFor="em">
                <input id="em" type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} />
              </FormField>
              <FormField label="National ID / CNIC" hint="13-digit CNIC · Encrypted (AES-256) — never stored on-chain" required htmlFor="nid">
                <input
                  id="nid" required inputMode="numeric" autoComplete="off"
                  value={form.nationalId}
                  onChange={(e) => setForm((f) => ({ ...f, nationalId: formatCnic(e.target.value) }))}
                  placeholder="42101-1234567-1"
                  className={`${inputCls} ${form.nationalId && !cnicValid ? "border-red-500/60" : cnicValid ? "border-emerald-500/50" : ""}`}
                />
                {form.nationalId && !cnicValid && (
                  <p className="text-xs text-red-500 mt-1">CNIC must be exactly 13 digits ({cnicDigits.length}/13).</p>
                )}
                {cnicValid && <p className="text-xs text-emerald-500 mt-1">✓ Valid CNIC format</p>}
              </FormField>

              {/* ── Document uploads ── */}
              <div className="pt-2">
                <p className="text-sm font-semibold text-fg">Supporting Documents <span className="text-red-500">*</span></p>
                <p className="text-xs text-muted mt-0.5 mb-3">All four are required. Upload clear photos/scans — text is extracted in your browser (OCR) so the reviewer can verify them.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {DOC_SLOTS.map((slot) => (
                    <DocSlot key={slot.type} slot={slot} doc={docs[slot.type]} onFile={handleFile} onRemove={removeDoc} />
                  ))}
                </div>
                {!allDocsAttached && (
                  <p className="text-xs text-amber-600 mt-2">All four documents are required to submit ({attachedCount}/4 uploaded).</p>
                )}
              </div>

              {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                <p className="text-sm">
                  {fee != null
                    ? <>Attestation fee: <span className="font-bold text-accent">Rs. {fee.toLocaleString()}</span></>
                    : <span className="text-xs text-muted">Select a program to see the fee.</span>}
                </p>
                <Button type="submit" loading={loading} disabled={scanning || !form.program || !cnicValid || !allDocsAttached} data-testid="submit-apply">
                  {loading ? "Submitting…" : scanning ? "Scanning documents…" : "Submit Application →"}
                </Button>
              </div>
            </motion.form>
          </>
        )}
      </main>
    </div>
  );
}

/* ── A single document upload tile ── */
function DocSlot({ slot, doc, onFile, onRemove }) {
  const inputId = `doc-${slot.type}`;
  return (
    <div className="rounded-xl border border-line bg-elevated p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg truncate">{slot.label}</p>
          <p className="text-[11px] text-faint">{slot.hint}</p>
        </div>
        {doc?.dataUrl && (
          <button type="button" onClick={() => onRemove(slot.type)} className="text-[11px] text-red-500 hover:underline shrink-0">Remove</button>
        )}
      </div>

      {doc?.dataUrl ? (
        <div className="mt-2.5 flex gap-3">
          <img src={doc.dataUrl} alt={slot.label} className="w-16 h-16 rounded-lg object-cover border border-line shrink-0" />
          <div className="min-w-0 flex-1 text-xs">
            {doc.status === "scanning" ? (
              <p className="text-accent">Scanning… {doc.progress ?? 0}%</p>
            ) : (
              <>
                <p className="text-emerald-500 font-semibold">✓ Scanned</p>
                <p className="text-faint mt-0.5 line-clamp-2 break-words">{doc.ocrText ? doc.ocrText.slice(0, 90) + "…" : "No text detected"}</p>
              </>
            )}
            {doc.error && <p className="text-amber-600 mt-0.5">{doc.error}</p>}
          </div>
        </div>
      ) : (
        <label htmlFor={inputId}
          className="mt-2.5 flex items-center justify-center gap-2 h-16 rounded-lg border border-dashed border-line text-xs text-muted cursor-pointer hover:border-accent/40 hover:text-fg transition-colors">
          {doc?.status === "error" ? <span className="text-red-500">{doc.error}</span> : <>＋ Choose image</>}
        </label>
      )}
      <input id={inputId} type="file" accept="image/*" className="hidden"
        onChange={(e) => onFile(slot, e.target.files?.[0])} />
    </div>
  );
}
