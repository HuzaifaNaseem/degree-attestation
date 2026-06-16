/**
 * VerifyDegree — employer verifies a degree hash on-chain.
 * Endpoint: POST /api/degrees/verify
 */
import Card       from "../components/ui/Card";
import VerifyForm from "../components/VerifyForm";
import Badge      from "../components/ui/Badge";

export default function VerifyDegree() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">Verify Degree</h1>
        <p className="text-sm text-muted mt-1">
          Check the authenticity of an academic credential against the blockchain.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form — 3 cols */}
        <div className="lg:col-span-3">
          <Card title="Degree Hash Lookup" subtitle="Enter the hash provided by the student or university">
            <VerifyForm />
          </Card>
        </div>

        {/* Info — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Result Meanings">
            <div className="space-y-3">
              {[
                { variant: "valid",   badge: "VALID",   desc: "Degree exists on-chain and has not been revoked. Credential is authentic.", bg: "bg-emerald-500/8 border-emerald-500/20" },
                { variant: "revoked", badge: "REVOKED", desc: "Degree was issued but subsequently revoked. Do not accept.", bg: "bg-amber-500/8 border-amber-500/20" },
                { variant: "fraud",   badge: "INVALID", desc: "Hash not found on blockchain. Fraudulent credential — flagged automatically.", bg: "bg-red-500/8 border-red-500/20" },
              ].map(({ variant, badge, desc, bg }) => (
                <div key={badge} className={`rounded-xl border p-3.5 ${bg}`}>
                  <Badge variant={variant} className="mb-2">{badge}</Badge>
                  <p className="text-muted text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Privacy & Audit">
            <ul className="space-y-2.5">
              {[
                "The hash reveals no personal information.",
                "Every verification emits an immutable on-chain event.",
                "Fraud attempts are automatically logged and flagged.",
                "The signing wallet pays a small gas fee for the event.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-xs text-muted">
                  <span className="text-accent font-bold shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
