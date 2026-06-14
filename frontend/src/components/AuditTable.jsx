/**
 * AuditTable — paginated audit log.
 * Endpoint: GET /reports/audit?page=&limit=&type=
 */
import { useEffect, useState } from "react";
import api        from "../api/axiosClient";
import Badge      from "./ui/Badge";
import Spinner    from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";
import Button     from "./ui/Button";

const TYPE_VARIANT = {
  DEGREE_ISSUED:       "info",
  DEGREE_VERIFIED:     "valid",
  DEGREE_REVOKED:      "warning",
  FRAUD_ATTEMPT:       "fraud",
  ROLE_GRANTED:        "purple",
  AUTH_LOGIN:          "neutral",
  AUTH_FAILURE:        "invalid",
  UNAUTHORIZED_ACCESS: "invalid",
};

const COLUMNS = ["Event Type", "Actor", "Role", "Degree Hash", "TX Hash", "Time"];

export default function AuditTable({ filterType }) {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [filterType]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page, limit: PAGE_SIZE });
    if (filterType) params.set("type", filterType);

    api.get(`/reports/audit?${params}`)
      .then(({ data }) => { setLogs(data.logs); setTotal(data.total); })
      .catch(() => setError("Could not load audit log"))
      .finally(() => setLoading(false));
  }, [page, filterType]);

  if (loading) return <Spinner />;
  if (error)   return <p className="text-sm text-red-400">{error}</p>;
  if (!logs.length) return <EmptyState title="No audit entries" icon="📋" message="Events appear here after on-chain activity." />;

  return (
    <div data-testid="audit-table" className="space-y-4">
      <p className="text-xs text-faint">{total} total entries</p>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="min-w-full text-sm">
          <thead className="bg-elevated text-xs uppercase tracking-wider text-faint border-b border-line">
            <tr>
              {COLUMNS.map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {logs.map((log) => (
              <tr
                key={log._id}
                data-testid="audit-row"
                className={log.isFraud ? "bg-red-500/5" : "hover:bg-elevated transition-colors"}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Badge variant={TYPE_VARIANT[log.eventType] ?? "neutral"}>
                    {log.eventType}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-accent/60">
                  {log.actor ? `${log.actor.slice(0, 10)}…` : "—"}
                </td>
                <td className="px-4 py-2.5 capitalize text-xs text-muted">{log.actorRole || "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-accent/50">
                  {log.degreeHash ? `${log.degreeHash.slice(0, 12)}…` : "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-accent/50">
                  {log.txHash ? `${log.txHash.slice(0, 12)}…` : "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-faint whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-faint">
          Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} data-testid="prev-page">
            ← Prev
          </Button>
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={logs.length < PAGE_SIZE} data-testid="next-page">
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
