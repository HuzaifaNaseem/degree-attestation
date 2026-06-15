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
function ReviewModal({ request, onClose, onResult }) {
  const [privateKey, setKey] = useState("");
  const [reason, setReason]  = useState("");
  const [busy, setBusy]      = useState("");
  const [error, setError]    = useState("");
  const isPending = request.status === "PENDING";

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
          className="w-full max-w-lg bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-fg">{request.applicantName}</h3>
              <p className="text-xs text-faint font-mono">REF {request._id.slice(-8).toUpperCase()}</p>
            </div>
            <Badge variant={STATUS_BADGE[request.status]}>{request.status}</Badge>
          </div>

          <dl className="rounded-xl bg-elevated border border-line p-4 text-sm space-y-2 mb-4">
            <Row k="Program" v={request.program} />
            <Row k="Student ID" v={request.studentId} mono />
            <Row k="Graduation" v={fmt(request.graduationDate)} />
            <Row k="Email" v={request.email} />
            <Row k="Attestation fee" v={`Rs. ${request.fee?.toLocaleString()}`} />
            {request.degreeHash && <Row k="Degree hash" v={`${request.degreeHash.slice(0, 22)}…`} mono />}
            {request.reviewNote && <Row k="Review note" v={request.reviewNote} />}
          </dl>

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
            <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
