/**
 * VerifyPieChart — verification result breakdown.
 * Slices: Valid / Revoked / Fraud.
 * Endpoint: GET /reports/summary
 */
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../../api/axiosClient";
import Spinner    from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import { chartColors, tooltipStyle } from "./chartTheme";

const PALETTE = { Valid: "#059669", Revoked: "#d97706", Fraud: "#dc2626" };

export default function VerifyPieChart() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get("/reports/summary")
      .then(({ data: d }) => {
        const valid = Math.max(0, d.totalVerifications - d.totalFraud - d.totalRevoked);
        setData([
          { name: "Valid",   value: valid          },
          { name: "Revoked", value: d.totalRevoked },
          { name: "Fraud",   value: d.totalFraud   },
        ].filter((x) => x.value > 0));
      })
      .catch(() => setError("Could not load verification data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <p className="text-sm text-red-500">{error}</p>;
  if (!data.length) return <EmptyState title="No verifications yet" icon="🔍" />;

  const c = chartColors();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%" cy="50%"
          innerRadius={45}
          outerRadius={80}
          paddingAngle={3}
          stroke={c.surface}
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={PALETTE[entry.name] ?? "#6b7280"} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle(c)} formatter={(v) => [v, "Count"]} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12, color: c.axis }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
