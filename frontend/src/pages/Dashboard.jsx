/**
 * Dashboard — role-aware landing page after login.
 * Admin: stats + recent audit events
 * University: issued degrees + stats
 * Employer: verify prompt
 */
import { useEffect, useState } from "react";
import { Link, Navigate }     from "react-router-dom";
import api        from "../api/axiosClient";
import StatCard   from "../components/ui/StatCard";
import Card       from "../components/ui/Card";
import Badge      from "../components/ui/Badge";
import Spinner    from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Button     from "../components/ui/Button";
import Certificate from "../components/Certificate";
import RevokeDialog from "../components/RevokeDialog";
import IssuanceLineChart from "../components/charts/IssuanceLineChart";
import VerifyPieChart    from "../components/charts/VerifyPieChart";
import FraudBarChart     from "../components/charts/FraudBarChart";

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}

// ── Admin ──────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [logs,    setLogs]    = useState([]);
  const [reqs,    setReqs]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/reports/summary"),
      api.get("/reports/audit?page=1&limit=6"),
      api.get("/requests").catch(() => ({ data: { counts: {} } })),
    ])
      .then(([s, l, r]) => { setSummary(s.data); setLogs(l.data.logs); setReqs(r.data.counts); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const REQ = [
    { label: "Pending",  value: reqs?.pending ?? 0,  cls: "text-amber-600" },
    { label: "Approved", value: reqs?.approved ?? 0, cls: "text-emerald-500" },
    { label: "Rejected", value: reqs?.rejected ?? 0, cls: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="On-Chain"       value={loading ? null : summary?.totalOnChain}       color="blue"   icon="🎓" loading={loading} />
        <StatCard label="Verifications"  value={loading ? null : summary?.totalVerifications}  color="green"  icon="✓"  loading={loading} />
        <StatCard label="Fraud Attempts" value={loading ? null : summary?.totalFraud}          color="red"    icon="⚠"  loading={loading} />
        <StatCard label="Revoked"        value={loading ? null : summary?.totalRevoked}        color="amber"  icon="🚫" loading={loading} />
        <StatCard label="Unauthorized"   value={loading ? null : summary?.totalUnauthorized}   color="purple" icon="🔒" loading={loading} />
      </div>

      {/* Analytics row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Issuance Trend" subtitle="Last 30 days"><IssuanceLineChart /></Card>
        <Card title="Verification Results" subtitle="Valid / Revoked / Fraud"><VerifyPieChart /></Card>
        <Card title="Event Frequency" subtitle="Issued / Verified / Fraud / Revoked"><FraudBarChart /></Card>
      </div>

      {/* Requests overview */}
      <Card title="Attestation Requests" subtitle="Application review queue">
        <div className="grid grid-cols-3 gap-4">
          {REQ.map((r) => (
            <div key={r.label} className="rounded-xl border border-line bg-elevated p-4 text-center">
              <p className={`text-3xl font-extrabold ${r.cls}`}>{r.value}</p>
              <p className="text-xs text-muted mt-1">{r.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-line">
          <Link to="/requests"><Button variant="secondary">Open Review Queue →</Button></Link>
        </div>
      </Card>

      {/* Recent activity */}
      <Card title="Recent Activity" subtitle="Latest 6 audit events">
        {loading ? <Spinner /> : logs.length === 0 ? (
          <EmptyState title="No events yet" icon="📋" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-faint uppercase tracking-wider border-b border-line">
                    <th className="text-left pb-3">Event</th>
                    <th className="text-left pb-3">Actor</th>
                    <th className="text-left pb-3">TX Hash</th>
                    <th className="text-left pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-elevated transition-colors">
                      <td className="py-3 pr-4">
                        <Badge variant={log.isFraud ? "fraud" : "neutral"}>{log.eventType}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-accent/70">
                        {log.actor?.slice(0, 10)}…
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-faint">
                        {log.txHash ? `${log.txHash.slice(0, 12)}…` : "—"}
                      </td>
                      <td className="py-3 text-xs text-faint">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-line">
              <Link to="/logs">
                <Button variant="secondary" data-testid="view-all-logs">View Full Audit Log →</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ── University ─────────────────────────────────────────────────────────────────
function UniversityDashboard() {
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cert,    setCert]    = useState(null);
  const [revoke,  setRevoke]  = useState(null);

  function loadDegrees() {
    api.get("/degrees")
      .then(({ data }) => setDegrees(data.degrees))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDegrees(); }, []);

  const active  = degrees.filter((d) => !d.isRevoked).length;
  const revoked = degrees.filter((d) =>  d.isRevoked).length;

  return (
    <div className="space-y-6">
      {cert && <Certificate degree={cert} onClose={() => setCert(null)} />}
      {revoke && <RevokeDialog degree={revoke} onClose={() => setRevoke(null)} onDone={loadDegrees} />}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Issued"    value={loading ? null : degrees.length} color="blue"  icon="🎓" loading={loading} />
        <StatCard label="Active Degrees"  value={loading ? null : active}          color="green" icon="✓"  loading={loading} />
        <StatCard label="Revoked Degrees" value={loading ? null : revoked}         color="amber" icon="🚫" loading={loading} />
      </div>

      <Card title="Issuance Trend" subtitle="Degrees issued over the last 30 days">
        <IssuanceLineChart />
      </Card>

      <Card title="Recently Issued Degrees" subtitle="Latest 10">
        {loading ? <Spinner /> : degrees.length === 0 ? (
          <EmptyState title="No degrees issued yet" icon="🎓" message="Issue your first degree credential on-chain." />
        ) : (
          <>
            <div className="space-y-2">
              {degrees.slice(0, 10).map((d) => (
                <div
                  key={d._id}
                  data-testid="degree-row"
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-3.5 hover:bg-elevated hover:border-accent/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-accent text-sm font-bold shrink-0">
                      {d.studentName?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-fg">{d.studentName} · {d.program}</p>
                      <p className="text-xs font-mono text-accent/50 mt-0.5">{d.degreeHash?.slice(0, 24)}…</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCert(d)}
                      data-testid="view-certificate"
                      className="text-xs font-semibold text-accent hover:bg-accent/10 border border-accent/30 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Certificate
                    </button>
                    {!d.isRevoked && (
                      <button
                        onClick={() => setRevoke(d)}
                        data-testid="revoke-degree"
                        className="text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                    <Badge variant={d.isRevoked ? "revoked" : "valid"}>
                      {d.isRevoked ? "Revoked" : "Active"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-line">
              <Link to="/issue">
                <Button data-testid="go-issue">Issue a New Degree →</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ── Employer ───────────────────────────────────────────────────────────────────
function EmployerDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        {/* CTA card */}
        <div className="rounded-2xl p-6 border border-accent/20 bg-accent/[0.07]">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-3xl mb-5">🔍</div>
          <h3 className="text-xl font-bold text-fg mb-1">Verify a Degree</h3>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            Check the authenticity of any degree credential against the private blockchain in real-time.
          </p>
          <Link to="/verify">
            <button
              data-testid="go-verify"
              className="bg-accent text-accent-fg font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/25"
            >
              Start Verification →
            </button>
          </Link>
        </div>

        {/* How it works */}
        <Card title="How Verification Works">
          <ol className="space-y-3 text-sm">
            {[
              "Obtain the degree hash from the university or student.",
              "Enter the hash and your employer wallet private key.",
              "The system queries the private blockchain in real-time.",
              <>Result: <Badge variant="valid">VALID</Badge>, <Badge variant="revoked">REVOKED</Badge>, or <Badge variant="fraud">INVALID</Badge>.</>,
              "Each verification emits an on-chain event — permanent audit trail.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = getUser();
  if (user?.role === "student") return <Navigate to="/my-credentials" replace />;
  const subtitle = {
    admin:      "System Administrator",
    university: "University Portal · Iqra University",
    employer:   "Employer Portal",
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted mt-1">{subtitle[user?.role]}</p>
      </div>

      {user?.role === "admin"      && <AdminDashboard />}
      {user?.role === "university" && <UniversityDashboard />}
      {user?.role === "employer"   && <EmployerDashboard />}
    </div>
  );
}
