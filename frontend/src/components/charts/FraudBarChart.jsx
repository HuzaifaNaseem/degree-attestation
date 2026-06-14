/**
 * FraudBarChart — event-type frequency comparison.
 * Bars: Degrees Issued / Verified / Fraud Attempts / Revoked.
 * Endpoint: GET /reports/summary
 */
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import api from "../../api/axiosClient";
import Spinner    from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import { chartColors, tooltipStyle } from "./chartTheme";

const COLORS = ["#C9A84C", "#059669", "#dc2626", "#d97706"];

export default function FraudBarChart() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get("/reports/summary")
      .then(({ data: d }) => {
        setData([
          { label: "Issued",       count: d.totalIssued        },
          { label: "Verified",     count: d.totalVerifications },
          { label: "Fraud",        count: d.totalFraud         },
          { label: "Revoked",      count: d.totalRevoked       },
        ]);
      })
      .catch(() => setError("Could not load summary data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <p className="text-sm text-red-500">{error}</p>;
  if (data.every((d) => d.count === 0)) return <EmptyState title="No activity yet" icon="📈" />;

  const c = chartColors();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
        <Tooltip {...tooltipStyle(c)} cursor={{ fill: c.grid, opacity: 0.3 }} formatter={(v) => [v, "Events"]} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
