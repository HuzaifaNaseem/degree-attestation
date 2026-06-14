/**
 * Reports — recharts analytics for admin.
 * Three charts:
 *   1. IssuanceLineChart  — degrees over time
 *   2. VerifyPieChart     — valid/revoked/fraud split
 *   3. FraudBarChart      — event frequency comparison
 */
import { useEffect, useState } from "react";
import api              from "../api/axiosClient";
import Card             from "../components/ui/Card";
import Spinner          from "../components/ui/Spinner";
import IssuanceLineChart from "../components/charts/IssuanceLineChart";
import VerifyPieChart   from "../components/charts/VerifyPieChart";
import FraudBarChart    from "../components/charts/FraudBarChart";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/summary")
      .then(({ data }) => setSummary(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">Reports</h1>
        <p className="text-sm text-muted mt-1">
          System analytics — all data sourced live from the backend.
        </p>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card title="Degrees Issued Over Time" subtitle="Last 30 days">
          <IssuanceLineChart />
        </Card>
        <Card title="Verification Results" subtitle="Valid / Revoked / Fraud">
          <VerifyPieChart />
        </Card>
        <Card title="Event Frequency" subtitle="Issued / Verified / Fraud / Revoked">
          <FraudBarChart />
        </Card>
      </div>

      {/* Summary table */}
      <Card
        title="System Summary"
        subtitle={summary ? `Generated at ${new Date(summary.generatedAt).toLocaleString()}` : ""}
      >
        {loading ? <Spinner /> : (
          <dl data-testid="summary-table" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Total Degrees On-Chain",       value: summary?.totalOnChain,       alert: false },
              { label: "Total Degrees in DB",          value: summary?.totalIssued,        alert: false },
              { label: "Total Verifications",          value: summary?.totalVerifications, alert: false },
              { label: "Fraud Attempts Detected",      value: summary?.totalFraud,         alert: summary?.totalFraud > 0 },
              { label: "Degrees Revoked",              value: summary?.totalRevoked,       alert: false },
              { label: "Unauthorized Access Attempts", value: summary?.totalUnauthorized,  alert: summary?.totalUnauthorized > 0 },
            ].map(({ label, value, alert }) => (
              <div
                key={label}
                className={`rounded-xl border p-4 ${
                  alert ? "border-red-500/30 bg-red-500/8" : "border-line bg-elevated"
                }`}
              >
                <p className={`text-3xl font-extrabold ${alert ? "text-red-400" : "text-fg"}`}>
                  {value ?? "—"}
                </p>
                <p className="text-xs text-muted mt-1 font-medium">{label}</p>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
