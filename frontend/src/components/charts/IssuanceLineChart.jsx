/**
 * IssuanceLineChart — degrees issued per day (last 30 days).
 * Endpoint: GET /reports/degrees-over-time
 */
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import api from "../../api/axiosClient";
import Spinner    from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import { chartColors, tooltipStyle } from "./chartTheme";

export default function IssuanceLineChart() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get("/reports/degrees-over-time")
      .then(({ data: d }) =>
        setData(d.data.map((r) => ({ date: r._id.slice(5), count: r.count })))
      )
      .catch(() => setError("Could not load issuance data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <p className="text-sm text-red-500">{error}</p>;
  if (!data.length) return <EmptyState title="No issuances yet" icon="📊" />;

  const c = chartColors();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
        <Tooltip {...tooltipStyle(c)} formatter={(v) => [v, "Degrees"]} />
        <Line
          type="monotone"
          dataKey="count"
          stroke={c.gold}
          strokeWidth={2.5}
          dot={{ r: 3, fill: c.gold }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
