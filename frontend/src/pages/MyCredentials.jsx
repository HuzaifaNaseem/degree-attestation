/**
 * MyCredentials — a student's private view of their own credential(s).
 * GET /api/auth/my-credentials (student role). Download certificate + share link.
 */
import { useEffect, useState } from "react";
import api         from "../api/axiosClient";
import Card        from "../components/ui/Card";
import Spinner     from "../components/ui/Spinner";
import EmptyState  from "../components/ui/EmptyState";
import Certificate from "../components/Certificate";

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}
const fmt = (u) => u ? new Date(u * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function MyCredentials() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [cert, setCert]       = useState(null);
  const [copied, setCopied]   = useState("");
  const user = getUser();

  useEffect(() => {
    api.get("/auth/my-credentials")
      .then(({ data }) => setData(data))
      .catch(() => setData({ degrees: [] }))
      .finally(() => setLoading(false));
  }, []);

  function copyLink(hash) {
    const url = `${window.location.origin}/verify-degree?hash=${hash}`;
    navigator.clipboard?.writeText(url);
    setCopied(hash); setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {cert && <Certificate degree={cert} onClose={() => setCert(null)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">My Credentials</h1>
        <p className="text-sm text-muted mt-1">
          Welcome{user?.name ? `, ${user.name}` : ""} · linked to <span className="font-mono text-accent">{user?.studentId || data?.studentId || "—"}</span>
        </p>
      </div>

      {loading ? <Spinner /> : !data?.degrees?.length ? (
        <Card>
          <EmptyState
            title="No credentials yet"
            icon="🎓"
            message="Once your institution issues your degree on-chain, it will appear here automatically."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.degrees.map((d) => (
            <div key={d.degreeHash} className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/25 text-accent text-lg font-bold flex items-center justify-center">
                    {d.studentName?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-fg">{d.program}</p>
                    <p className="text-sm text-muted">{d.studentName}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  d.isRevoked ? "bg-red-500/15 text-red-500 border-red-500/30" : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"}`}>
                  {d.isRevoked ? "REVOKED" : "VERIFIED ✓"}
                </span>
              </div>

              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-line pt-4">
                <div className="flex justify-between"><dt className="text-muted">Graduated</dt><dd className="font-medium">{fmt(d.graduationDate)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Issued</dt><dd className="font-medium">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}</dd></div>
                <div className="sm:col-span-2 flex justify-between gap-3"><dt className="text-muted shrink-0">Credential hash</dt><dd className="font-mono text-xs text-accent/70 truncate">{d.degreeHash}</dd></div>
              </dl>

              <div className="flex flex-wrap gap-3 mt-5">
                <button onClick={() => setCert(d)}
                  className="bg-accent text-accent-fg font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20">
                  📜 View / Download Certificate
                </button>
                <button onClick={() => copyLink(d.degreeHash)}
                  className="text-sm font-semibold text-accent border border-accent/30 hover:bg-accent/10 rounded-xl px-5 py-2.5 transition-colors">
                  {copied === d.degreeHash ? "Link copied ✓" : "Copy verification link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
