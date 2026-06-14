/**
 * RevokeDialog — university revokes an issued degree on-chain.
 * Endpoint: POST /api/degrees/:hash/revoke  { reason, privateKey }
 * Only the issuing university wallet can revoke (enforced by the contract).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api      from "../api/axiosClient";
import Button   from "./ui/Button";
import FormField, { inputCls } from "./ui/FormField";

export default function RevokeDialog({ degree, onClose, onDone }) {
  const [reason,     setReason]     = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  if (!degree) return null;

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.post(`/degrees/${degree.degreeHash}/revoke`, { reason, privateKey });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Revocation failed. Check the key and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md bg-surface border border-line rounded-2xl p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center text-xl shrink-0">⚠</div>
            <div>
              <h3 className="text-lg font-bold text-fg">Revoke Degree</h3>
              <p className="text-sm text-muted">
                {degree.studentName} · {degree.program}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted bg-elevated border border-line rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
            This permanently marks the credential as <span className="text-red-500 font-semibold">REVOKED</span> on
            the blockchain. Future verifications will show REVOKED. This cannot be undone.
          </p>

          <form onSubmit={submit} className="space-y-4" data-testid="revoke-form">
            <FormField label="Reason for revocation" required htmlFor="revoke-reason">
              <input
                id="revoke-reason" type="text" required
                data-testid="input-revoke-reason"
                value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Issued in error / disciplinary action"
                className={inputCls}
              />
            </FormField>

            <FormField label="University Wallet Private Key" required htmlFor="revoke-key"
              hint="Signs the revocation transaction — must be the issuing wallet">
              <input
                id="revoke-key" type="password" required
                data-testid="input-revoke-key"
                value={privateKey} onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="0x…"
                className={`${inputCls} font-mono`}
              />
            </FormField>

            {error && (
              <p data-testid="revoke-error" className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="danger" loading={loading} data-testid="confirm-revoke" className="flex-1">
                {loading ? "Revoking…" : "Revoke on-chain"}
              </Button>
            </div>

            {loading && (
              <p className="text-xs text-muted text-center leading-relaxed">
                ⏳ Confirming on the blockchain — this can take up to a minute on first use. Please wait.
              </p>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
