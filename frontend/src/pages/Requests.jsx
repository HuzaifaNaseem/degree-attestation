/**
 * Requests — institution review queue for attestation applications.
 * Reviewer (university/admin) approves → issues on-chain, or rejects with a note.
 * GET /api/requests · POST /api/requests/:id/approve|reject
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api        from "../api/axiosClient";
import Card       from "../components/ui/Card";
import Badge      from "../components/ui/Badge";
import Button     from "../components/ui/Button";
import Spinner    from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Toast      from "../components/ui/Toast";
import FormField, { inputCls } from "../components/ui/FormField";

const STATUS_BADGE = {
  PENDING:  "revoked",   // amber
  APPROVED: "valid",     // green
  REJECTED: "fraud",     // red
};
const TABS = [
  { key: "all",      label: "All" },
  { key: "PENDING",  label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

export default function Requests() {
  const [data, setData]       = useState({ requests: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("all");
  const [active, setActive]   = useState(null);   // request being reviewed
  const [toast, setToast]     = useState(null);

  function load() {
    api.get("/requests")
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const list = data.requests.filter((r) => tab === "all" || r.status === tab);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {active && (
        <ReviewModal
          request={active}
          onClose={() => setActive(null)}
          onResult={(msg, type) => { setToast({ message: msg, type }); load(); }}
        />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">Attestation Requests</h1>
        <p className="text-sm text-muted mt-1">Review applications and issue credentials on-chain.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => {
          const count = t.key === "all" ? data.counts.all : data.counts[t.key.toLowerCase()];
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                on ? "bg-accent/15 text-accent border-accent/40" : "bg-surface text-muted border-line hover:text-fg"
              }`}
            >
              {t.label}{count != null && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <Card>
        {loading ? <Spinner /> : list.length === 0 ? (
          <EmptyState title="No applications here" icon="📥" message="Submitted attestation requests appear here for review." />
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <div key={r._id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3.5 hover:bg-elevated hover:border-accent/20 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/25 text-accent text-sm font-bold flex items-center justify-center shrink-0">
                    {r.applicantName?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg truncate">{r.applicantName} · <span className="text-muted font-normal">{r.program}</span></p>
                    <p className="text-xs text-faint font-mono">REF {r._id.slice(-8).toUpperCase()} · Rs. {r.fee?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {r.aiReview && (
                    <span title={`AI: ${r.aiReview.recommendation} (${r.aiReview.confidence}%)`}
                      className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        r.aiReview.recommendation === "APPROVE" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                        : r.aiReview.recommendation === "REJECT" ? "text-red-500 border-red-500/30 bg-red-500/10"
                        : "text-amber-600 border-amber-500/30 bg-amber-500/10"}`}>
                      🤖 {r.aiReview.recommendation}
                    </span>
                  )}
                  <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
                  {r.status === "PENDING" ? (
                    <Button variant="secondary" onClick={() => setActive(r)} data-testid="review-request">Review →</Button>
                  ) : (
                    <button onClick={() => setActive(r)} className="text-xs text-muted hover:text-fg">Details</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Review modal ── */
const AI_STYLE = {
  APPROVE: { accent: "text-emerald-500", bar: "bg-emerald-500", bg: "bg-emerald-500/[0.06]", bd: "border-emerald-500/30", icon: "✓", label: "Recommend approval" },
  REJECT:  { accent: "text-red-500",     bar: "bg-red-500",     bg: "bg-red-500/[0.06]",     bd: "border-red-500/30",     icon: "✕", label: "Recommend rejection" },
  REVIEW:  { accent: "text-amber-600",   bar: "bg-amber-500",   bg: "bg-amber-500/[0.06]",   bd: "border-amber-500/30",   icon: "!", label: "Needs human review" },
};

function ReviewModal({ request, onClose, onResult }) {
  const [detail, setDetail]   = useState(null);   // full request incl. decrypted documents
  const [ai, setAi]           = useState(request.aiReview || null);
  const [analyzing, setAnalyz]= useState(false);
  const [privateKey, setKey]  = useState("");
  const [reason, setReason]   = useState("");
  const [busy, setBusy]       = useState("");
  const [error, setError]     = useState("");
  const isPending = request.status === "PENDING";
  const r = detail || request;            // show list data immediately, enrich when detail loads
  const ref = request._id.slice(-8).toUpperCase();

  useEffect(() => {
    api.get(`/requests/${request._id}`)
      .then(({ data }) => { setDetail(data.request); if (data.request.aiReview) setAi(data.request.aiReview); })
      .catch(() => {});
  }, [request._id]);

  async function analyze() {
    setError(""); setAnalyz(true);
    try {
      const { data } = await api.post(`/requests/${request._id}/analyze`);
      setAi(data.aiReview);
    } catch (e) { setError(e.response?.data?.error || "AI analysis failed"); } finally { setAnalyz(false); }
  }
  async function approve() {
    if (!privateKey) { setError("Enter the university wallet key to issue on-chain."); return; }
    setError(""); setBusy("approve");
    try {
      await api.post(`/requests/${request._id}/approve`, { privateKey });
      onResult(`Approved & issued on-chain for ${request.applicantName}`, "success");
      onClose();
    } catch (e) { setError(e.response?.data?.error || "Approval failed"); } finally { setBusy(""); }
  }
  async function reject() {
    setError(""); setBusy("reject");
    try {
      await api.post(`/requests/${request._id}/reject`, { reason });
      onResult(`Application from ${request.applicantName} rejected`, "success");
      onClose();
    } catch (e) { setError(e.response?.data?.error || "Reject failed"); } finally { setBusy(""); }
  }

  const fmt = (u) => u ? new Date(u * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  const s = ai ? (AI_STYLE[ai.recommendation] || AI_STYLE.REVIEW) : null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-surface border border-line rounded-2xl overflow-hidden shadow-2xl">

          {/* ── Header ── */}
          <header className="relative shrink-0 px-6 py-5 border-b border-line bg-gradient-to-br from-accent/10 via-surface to-surface">
            <button onClick={onClose} aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-fg/5 transition-colors">✕</button>
            <div className="flex items-center gap-4 pr-10">
              <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent text-xl font-bold flex items-center justify-center shrink-0">
                {r.applicantName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-fg truncate">{r.applicantName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-faint">REF {ref}</span>
                  <span className="text-faint">·</span>
                  <Badge variant={STATUS_BADGE[request.status]}>{request.status}</Badge>
                </div>
              </div>
            </div>
          </header>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Applicant details */}
            <section>
              <SectionLabel>Applicant Details</SectionLabel>
              <div className="grid grid-cols-2 gap-px bg-line rounded-xl overflow-hidden border border-line">
                <Field k="Program" v={r.program} wide />
                <Field k="Student ID" v={r.studentId} mono />
                <Field k="Graduation" v={fmt(r.graduationDate)} />
                <Field k="Email" v={r.email} wide />
                <Field k="Attestation fee" v={`Rs. ${r.fee?.toLocaleString()}`} />
                <Field k="Submitted" v={r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"} />
                {r.degreeHash && <Field k="Degree hash" v={`${r.degreeHash.slice(0, 26)}…`} mono wide />}
                {r.reviewNote && <Field k="Review note" v={r.reviewNote} wide />}
              </div>
            </section>

            {/* Documents */}
            <section>
              <SectionLabel>Documents{detail?.documents?.length ? ` · ${detail.documents.length}` : ""}</SectionLabel>
              {detail == null ? (
                <p className="text-xs text-faint">Loading documents…</p>
              ) : detail.documents?.length ? (
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {detail.documents.map((d, i) => <DocReview key={i} doc={d} />)}
                </div>
              ) : (
                <p className="text-xs text-muted bg-elevated border border-line rounded-xl px-4 py-3">No documents were attached to this application.</p>
              )}
            </section>

            {/* AI verification */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel className="mb-0">AI Verification Agent</SectionLabel>
                <Button variant="secondary" onClick={analyze} loading={analyzing} className="!py-1.5 !px-3 text-xs">
                  {ai ? "Re-run" : "Run AI analysis"}
                </Button>
              </div>
              {ai ? (
                <div className={`rounded-xl border ${s.bd} ${s.bg} overflow-hidden`}>
                  <div className="flex items-stretch">
                    <div className={`w-1 shrink-0 ${s.bar}`} />
                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-2 text-sm font-extrabold ${s.accent}`}>
                          <span className={`w-5 h-5 rounded-full ${s.bar} text-white text-[11px] font-bold flex items-center justify-center`}>{s.icon}</span>
                          {s.label}
                        </span>
                        <span className="text-xs font-semibold text-muted shrink-0">{ai.confidence}%</span>
                      </div>
                      {/* confidence bar */}
                      <div className="h-1.5 rounded-full bg-line mt-2.5 overflow-hidden">
                        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${ai.confidence}%` }} />
                      </div>
                      {ai.summary && <p className="text-sm text-fg/90 mt-3 leading-relaxed">{ai.summary}</p>}
                      {ai.reasons?.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {ai.reasons.map((x, i) => (
                            <li key={i} className="flex gap-2 text-xs text-muted"><span className="text-emerald-500 shrink-0">✓</span><span>{x}</span></li>
                          ))}
                        </ul>
                      )}
                      {ai.redFlags?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-line">
                          <p className="text-xs font-semibold text-red-500 mb-1.5">Red flags</p>
                          <ul className="space-y-1.5">
                            {ai.redFlags.map((x, i) => (
                              <li key={i} className="flex gap-2 text-xs text-red-500/90"><span className="shrink-0">⚠</span><span>{x}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-elevated border border-line text-muted">🤖 {ai.model}</span>
                        <span className="text-[11px] text-faint">Advisory only — the reviewer makes the final decision.</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted bg-elevated border border-line rounded-xl px-4 py-3 leading-relaxed">
                  Run the agent to cross-check the uploaded documents against the application and get an approve / review / reject recommendation.
                </p>
              )}
            </section>

            {/* Decision inputs (pending only) */}
            {isPending && (
              <section className="space-y-3 pt-1">
                <SectionLabel>Reviewer Decision</SectionLabel>
                <FormField label="University Wallet Private Key" hint="Required to issue the credential on-chain" htmlFor="rk">
                  <input id="rk" type="password" value={privateKey} onChange={(e) => setKey(e.target.value)} placeholder="0x…" className={`${inputCls} font-mono`} />
                </FormField>
                <FormField label="Rejection reason (if rejecting)" htmlFor="rr">
                  <input id="rr" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Documents incomplete" className={inputCls} />
                </FormField>
              </section>
            )}

            {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>}
          </div>

          {/* ── Sticky footer ── */}
          <footer className="shrink-0 px-6 py-4 border-t border-line bg-surface">
            {isPending ? (
              <>
                <div className="flex gap-3">
                  <Button variant="danger" onClick={reject} loading={busy === "reject"} className="flex-1">Reject</Button>
                  <Button onClick={approve} loading={busy === "approve"} data-testid="approve-request" className="flex-1">Approve &amp; Issue ⛓</Button>
                </div>
                {busy === "approve" && <p className="text-xs text-muted text-center mt-2.5">⏳ Issuing on the blockchain — up to a minute. Please wait.</p>}
              </>
            ) : (
              <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
            )}
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SectionLabel({ children, className = "" }) {
  return <p className={`text-[11px] font-bold uppercase tracking-widest text-faint mb-2 ${className}`}>{children}</p>;
}

/* ── One uploaded document: preview thumbnail + collapsible OCR text ── */
function DocReview({ doc }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-elevated p-3 hover:border-accent/25 transition-colors">
      <div className="flex items-center gap-3">
        {doc.dataUrl
          ? <img src={doc.dataUrl} alt={doc.label} className="w-12 h-12 rounded-lg object-cover border border-line shrink-0" />
          : <div className="w-12 h-12 rounded-lg bg-line flex items-center justify-center text-faint text-lg shrink-0">📄</div>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg truncate">{doc.label}</p>
          <p className="text-[11px] mt-0.5">
            {doc.ocrText
              ? <span className="text-emerald-500">✓ {doc.ocrText.length} chars OCR'd</span>
              : <span className="text-faint">no text extracted</span>}
          </p>
        </div>
        {doc.ocrText && (
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-accent hover:underline shrink-0">{open ? "Hide" : "View text"}</button>
        )}
      </div>
      {open && doc.ocrText && (
        <pre className="mt-2.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-muted bg-bg border border-line rounded-lg p-2.5 font-mono">{doc.ocrText}</pre>
      )}
    </div>
  );
}

function Field({ k, v, mono, wide }) {
  return (
    <div className={`bg-surface p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{k}</p>
      <p className={`text-sm mt-0.5 break-words ${mono ? "font-mono text-xs text-accent/80" : "font-medium text-fg"}`}>{v}</p>
    </div>
  );
}
