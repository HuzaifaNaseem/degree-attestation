/**
 * VerifyForm — employer submits a degree hash for on-chain verification.
 * Endpoint: POST /api/degrees/verify
 * Response uses status enum: "VALID" | "INVALID" | "REVOKED"
 */
import { useState } from "react";
import api         from "../api/axiosClient";
import Button      from "./ui/Button";
import Badge       from "./ui/Badge";
import FormField, { inputCls } from "./ui/FormField";

const STATUS_CONFIG = {
  VALID:   {
    variant: "valid",
    icon: "✓",
    label: "VALID — Degree is authentic",
    border: "border-emerald-500/30 bg-emerald-500/8",
    iconBg: "bg-emerald-500/15 text-emerald-400",
  },
  REVOKED: {
    variant: "revoked",
    icon: "⚠",
    label: "REVOKED — Degree has been revoked",
    border: "border-amber-500/30 bg-amber-500/8",
    iconBg: "bg-amber-500/15 text-amber-400",
  },
  INVALID: {
    variant: "fraud",
    icon: "✕",
    label: "INVALID — Degree not found on blockchain",
    border: "border-red-500/30 bg-red-500/8",
    iconBg: "bg-red-500/15 text-red-400",
  },
};

export default function VerifyForm() {
  const [degreeHash, setDegreeHash] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    setApiError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/degrees/verify", { degreeHash, privateKey });
      setResult(data);
    } catch (err) {
      setApiError(err.response?.data?.error || "Verification request failed");
    } finally {
      setLoading(false);
    }
  }

  const cfg = result?.status ? STATUS_CONFIG[result.status] : null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} data-testid="verify-form" className="space-y-4">
        <FormField
          label="Degree Hash"
          hint="0x-prefixed 64-character hex string (bytes32)"
          required
          htmlFor="degreeHash"
        >
          <input
            id="degreeHash" type="text" required
            data-testid="input-degreeHash"
            value={degreeHash}
            onChange={(e) => setDegreeHash(e.target.value)}
            placeholder="0x1a2b3c…"
            className={`${inputCls} font-mono`}
          />
        </FormField>

        <FormField
          label="Employer Wallet Private Key"
          hint="Signs the on-chain verification transaction — never stored"
          required
          htmlFor="verifyPrivateKey"
        >
          <input
            id="verifyPrivateKey" type="password" required
            data-testid="input-verifyPrivateKey"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="0x…"
            className={`${inputCls} font-mono`}
          />
        </FormField>

        {apiError && (
          <div
            data-testid="verify-error"
            className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
          >
            {apiError}
          </div>
        )}

        <Button
          type="submit"
          variant="success"
          loading={loading}
          data-testid="submit-verify"
          className="w-full"
        >
          {loading ? "Verifying on-chain…" : "Verify Degree"}
        </Button>
      </form>

      {/* Result panel */}
      {result && cfg && (
        <div
          data-testid="verify-result"
          className={`rounded-xl border-2 p-6 ${cfg.border}`}
        >
          {/* Status */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${cfg.iconBg}`}>
              {cfg.icon}
            </div>
            <div>
              <Badge variant={cfg.variant} size="lg">{result.status}</Badge>
              <p className="text-xs text-muted mt-1">{cfg.label}</p>
            </div>
          </div>

          {/* Degree details (only if found on-chain) */}
          {result.status !== "INVALID" && (
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
              {result.program && (
                <div>
                  <dt className="text-xs font-semibold text-faint uppercase tracking-wide mb-0.5">Program</dt>
                  <dd className="font-semibold text-fg">{result.program}</dd>
                </div>
              )}
              {result.issuedAt && (
                <div>
                  <dt className="text-xs font-semibold text-faint uppercase tracking-wide mb-0.5">Issued</dt>
                  <dd className="font-semibold text-fg">
                    {new Date(result.issuedAt * 1000).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {result.issuingUniversity && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-faint uppercase tracking-wide mb-0.5">Issuing University</dt>
                  <dd className="font-mono text-xs text-accent/70 break-all">{result.issuingUniversity}</dd>
                </div>
              )}
              {result.metadata?.studentName && (
                <div>
                  <dt className="text-xs font-semibold text-faint uppercase tracking-wide mb-0.5">Student</dt>
                  <dd className="font-semibold text-fg">{result.metadata.studentName}</dd>
                </div>
              )}
            </dl>
          )}

          {/* TX info */}
          <div className="border-t border-fg/10 pt-3 space-y-1">
            <p className="text-xs text-faint">
              <span className="font-semibold text-muted">TX:</span>{" "}
              <span className="font-mono text-accent/60">{result.txHash}</span>
            </p>
            {result.txTimeMs !== undefined && (
              <p className="text-xs text-faint">Confirmed in {result.txTimeMs}ms</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
