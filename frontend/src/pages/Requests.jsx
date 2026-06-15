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
  APPROVE: { ring: "border-emerald-500/40 bg-emerald-500/[0.07]", text: "text-emerald-500", label: "Recommend APPROVE" },
  REJECT:  { ring: "border-red-500/40 bg-red-500/[0.07]",         text: "text-red-500",     label: "Recommend REJECT" },
  REVIEW:  { ring: "border-amber-500/40 bg-amber-500/[0.07]",     text: "text-amber-600",   label: "Needs human REVIEW" },
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

  const fmt = (u) => u ? new Date(u * 1000).toLocaleDateString() : "—";

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-fg">{r.applicantName}</h3>
              <p className="text-xs text-faint font-mono">REF {request._id.slice(-8).toUpperCase()}</p>
            </div>
            <Badge variant={STATUS_BADGE[request.status]}>{request.status}</Badge>
          </div>

          <dl className="rounded-xl bg-elevated border border-line p-4 text-sm space-y-2 mb-4">
            <Row k="Program" v={r.program} />
            <Row k="Student ID" v={r.studentId} mono />
            <Row k="Graduation" v={fmt(r.graduationDate)} />
            <Row k="Email" v={r.email} />
            <Row k="Attestation fee" v={`Rs. ${r.fee?.toLocaleString()}`} />
            {r.degreeHash && <Row k="Degree hash" v={`${r.degreeHash.slice(0, 22)}…`} mono />}
            {r.reviewNote && <Row k="Review note" v={r.reviewNote} />}
          </dl>

          {/* ── Uploaded documents (decrypted for the reviewer) + OCR text ── */}
          {detail?.documents?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-faint mb-2">Documents ({detail.documents.length})</p>
              <div className="space-y-2">
                {detail.documents.map((d, i) => <DocReview key={i} doc={d} />)}
              </div>
            </div>
          )}

          {/* ── AI verification agent ── */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-faint">AI Verification Agent</p>
              <Button variant="secondary" onClick={analyze} loading={analyzing} className="!py-1 text-xs">
                {ai ? "Re-run analysis" : "Run AI analysis"}
              </Button>
            </div>
            {ai ? (
              <div className={`rounded-xl border p-4 ${AI_STYLE[ai.recommendation]?.ring || "border-line bg-elevated"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-extrabold ${AI_STYLE[ai.recommendation]?.text}`}>{AI_STYLE[ai.recommendation]?.label || ai.recommendation}</span>
                  <span className="text-xs text-muted">{ai.confidence}% confidence</span>
                </div>
                {ai.summary && <p className="text-sm text-fg/90 mt-2">{ai.summary}</p>}
                {ai.reasons?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted list-disc list-inside">
                    {ai.reasons.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                )}
                {ai.redFlags?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-line">
                    <p className="text-xs font-semibold text-red-500 mb-1">⚠ Red flags</p>
                    <ul className="space-y-1 text-xs text-red-500/90 list-disc list-inside">
                      {ai.redFlags.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-[11px] text-faint mt-2">Advisory only · {ai.model} · the reviewer makes the final decision</p>
              </div>
            ) : (
              <p className="text-xs text-muted bg-elevated border border-line rounded-xl px-4 py-3">
                Run the AI agent to cross-check the uploaded documents against the application and get an approve/reject recommendation.
              </p>
            )}
          </div>

          {isPending ? (
            <>
              <FormField label="University Wallet Private Key" hint="Required to issue the credential on-chain" htmlFor="rk">
                <input id="rk" type="password" value={privateKey} onChange={(e) => setKey(e.target.value)} placeholder="0x…" className={`${inputCls} font-mono`} />
              </FormField>
              <div className="mt-3">
                <FormField label="Rejection reason (if rejecting)" htmlFor="rr">
                  <input id="rr" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Documents incomplete" className={inputCls} />
                </FormField>
              </div>
              {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mt-3">{error}</p>}
              <div className="flex gap-3 mt-5">
                <Button variant="danger" onClick={reject} loading={busy === "reject"} className="flex-1">Reject</Button>
                <Button onClick={approve} loading={busy === "approve"} data-testid="approve-request" className="flex-1">Approve & Issue ⛓</Button>
              </div>
              {busy === "approve" && <p className="text-xs text-muted text-center mt-3">⏳ Issuing on the blockchain — up to a minute. Please wait.</p>}
            </>
          ) : (
            <>
              {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-3">{error}</p>}
              <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── One uploaded document: preview thumbnail + collapsible OCR text ── */
function DocReview({ doc }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-elevated p-3">
      <div className="flex items-center gap-3">
        {doc.dataUrl
          ? <img src={doc.dataUrl} alt={doc.label} className="w-12 h-12 rounded-lg object-cover border border-line shrink-0" />
          : <div className="w-12 h-12 rounded-lg bg-line flex items-center justify-center text-faint text-lg shrink-0">📄</div>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg truncate">{doc.label}</p>
          <p className="text-[11px] text-faint">{doc.ocrText ? `${doc.ocrText.length} chars extracted` : "no text extracted"}</p>
        </div>
        {doc.ocrText && (
          <button onClick={() => setOpen((o) => !o)} className="text-xs text-accent hover:underline shrink-0">{open ? "Hide text" : "View text"}</button>
        )}
      </div>
      {open && doc.ocrText && (
        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-muted bg-bg border border-line rounded-lg p-2 font-mono">{doc.ocrText}</pre>
      )}
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted shrink-0">{k}</dt>
      <dd className={`text-fg text-right ${mono ? "font-mono text-xs text-accent/80" : "font-medium"}`}>{v}</dd>
    </div>
  );
}
