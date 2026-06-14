/**
 * IssueDegree — university issues a degree on-chain.
 * Endpoint: POST /api/degrees/issue
 */
import { useEffect, useState } from "react";
import api        from "../api/axiosClient";
import DegreeForm from "../components/DegreeForm";
import Card       from "../components/ui/Card";
import Badge      from "../components/ui/Badge";
import Spinner    from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Certificate from "../components/Certificate";

export default function IssueDegree() {
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cert,    setCert]    = useState(null);

  async function loadDegrees() {
    try {
      const { data } = await api.get("/degrees");
      setDegrees(data.degrees);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadDegrees(); }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {cert && <Certificate degree={cert} onClose={() => setCert(null)} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">Issue Degree</h1>
        <p className="text-sm text-muted mt-1">
          Register a new academic credential on the private Ethereum blockchain.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form — 3 cols */}
        <div className="lg:col-span-3">
          <Card title="Degree Details" subtitle="All fields are validated before on-chain submission">
            <DegreeForm onSuccess={loadDegrees} />
          </Card>
        </div>

        {/* Info sidebar — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="What happens on submit">
            <ol className="space-y-4">
              {[
                { step: "Validated",  desc: "express-validator checks all fields server-side." },
                { step: "Signed",     desc: <>Your wallet signs the tx; contract stores <code className="text-xs bg-accent/10 text-accent rounded px-1 font-mono">keccak256(id‖prog‖date‖addr)</code>.</> },
                { step: "Encrypted",  desc: "National ID is AES-256 encrypted in MongoDB — never on-chain." },
                { step: "Event",      desc: <><code className="text-xs bg-elevated text-muted rounded px-1 font-mono">DegreeIssued</code> event emitted and audit log updated.</> },
              ].map(({ step, desc }, i) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted leading-relaxed">
                    <span className="font-semibold text-fg">{step} — </span>{desc}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Your Issued Degrees">
            {loading ? <Spinner size="sm" /> : degrees.length === 0 ? (
              <EmptyState title="None yet" icon="🎓" />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {degrees.slice(0, 8).map((d) => (
                  <button
                    key={d._id}
                    onClick={() => setCert(d)}
                    data-testid="view-certificate"
                    title="View certificate"
                    className="w-full text-left flex items-center justify-between border border-line rounded-xl px-3 py-2.5 hover:bg-elevated hover:border-accent/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center shrink-0 border border-accent/25">
                        {d.studentName?.[0] ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-fg truncate">{d.studentName}</p>
                        <p className="text-xs text-faint">{d.program}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity">Certificate →</span>
                      <Badge variant={d.isRevoked ? "revoked" : "valid"} size="xs">
                        {d.isRevoked ? "Revoked" : "Active"}
                      </Badge>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
