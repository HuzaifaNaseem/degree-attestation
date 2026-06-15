/**
 * BulkIssue — university issues many degrees from a CSV in one batch.
 * Parses CSV client-side, previews rows, then issues each on-chain sequentially
 * (reusing POST /api/degrees/issue) with live per-row status. A production-grade
 * "batch" workflow real registrars need at graduation time.
 */
import { useState } from "react";
import api          from "../api/axiosClient";
import Card         from "../components/ui/Card";
import Button       from "../components/ui/Button";
import Badge        from "../components/ui/Badge";
import FormField, { inputCls } from "../components/ui/FormField";

const TEMPLATE =
  "studentName,studentId,program,graduationDate,nationalId,gpa\n" +
  "Ali Hassan,IU-2026-301,BSCS,2026-06-30,42101-1111111-1,3.7\n" +
  "Sara Khan,IU-2026-302,BSSE,2026-06-30,42101-2222222-2,3.9\n" +
  "Bilal Ahmed,IU-2026-303,BSIT,2026-06-30,42101-3333333-3,3.5";

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
    return row;
  });
}

export default function BulkIssue() {
  const [rows, setRows]         = useState([]);     // [{...row, _status, _hash, _error}]
  const [privateKey, setKey]    = useState("");
  const [running, setRunning]   = useState(false);
  const [fileName, setFileName] = useState("");

  function loadText(text) {
    const parsed = parseCSV(text).map((r) => ({ ...r, _status: "ready" }));
    setRows(parsed);
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => loadText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "attestify-bulk-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function issueAll() {
    if (!privateKey || !rows.length) return;
    setRunning(true);
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      if (next[i]._status === "done") continue;
      next[i] = { ...next[i], _status: "issuing" };
      setRows([...next]);
      try {
        const { data } = await api.post("/degrees/issue", {
          studentName:    next[i].studentName,
          studentId:      next[i].studentId,
          program:        next[i].program,
          graduationDate: Math.floor(new Date(next[i].graduationDate).getTime() / 1000),
          nationalId:     next[i].nationalId,
          gpa:            next[i].gpa || undefined,
          privateKey,
        });
        next[i] = { ...next[i], _status: "done", _hash: data.degree.degreeHash };
      } catch (err) {
        next[i] = { ...next[i], _status: "error", _error: err.response?.data?.error || "failed" };
      }
      setRows([...next]);
    }
    setRunning(false);
  }

  const done   = rows.filter((r) => r._status === "done").length;
  const failed = rows.filter((r) => r._status === "error").length;

  const STATUS = {
    ready:   <Badge variant="neutral" size="xs">Ready</Badge>,
    issuing: <Badge variant="info" size="xs">Issuing…</Badge>,
    done:    <Badge variant="valid" size="xs">✓ On-chain</Badge>,
    error:   <Badge variant="fraud" size="xs">Failed</Badge>,
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">Bulk Issuance</h1>
        <p className="text-sm text-muted mt-1">
          Upload a CSV of graduates to issue many credentials on-chain in one batch.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="1 · Upload CSV">
            <div className="space-y-3">
              <input
                type="file" accept=".csv" onChange={onFile} data-testid="csv-input"
                className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:text-accent-fg file:px-3 file:py-2 file:text-xs file:font-semibold hover:file:opacity-90"
              />
              {fileName && <p className="text-xs text-muted truncate">📄 {fileName}</p>}
              <button onClick={downloadTemplate} className="text-xs text-accent hover:underline">
                ↓ Download CSV template
              </button>
            </div>
          </Card>

          <Card title="2 · Sign & issue">
            <FormField label="University Wallet Private Key" required htmlFor="bulk-key"
              hint="Signs every transaction — never stored">
              <input
                id="bulk-key" type="password" value={privateKey} onChange={(e) => setKey(e.target.value)}
                placeholder="0x…" className={`${inputCls} font-mono`} data-testid="bulk-key"
              />
            </FormField>
            <Button
              onClick={issueAll}
              loading={running}
              disabled={!rows.length || !privateKey}
              data-testid="issue-all"
              className="w-full mt-4"
            >
              {running ? "Issuing batch…" : `Issue ${rows.length || ""} on-chain`}
            </Button>
            {running && (
              <p className="text-xs text-muted text-center mt-3 leading-relaxed">
                ⏳ Each credential is a real blockchain transaction (~20s each). Please wait.
              </p>
            )}
            {(done > 0 || failed > 0) && !running && (
              <p className="text-xs text-center mt-3">
                <span className="text-emerald-500 font-semibold">{done} issued</span>
                {failed > 0 && <span className="text-red-500 font-semibold"> · {failed} failed</span>}
              </p>
            )}
          </Card>
        </div>

        {/* Preview / progress */}
        <div className="lg:col-span-2">
          <Card title="Preview" subtitle={rows.length ? `${rows.length} rows loaded` : "No file loaded yet"}>
            {!rows.length ? (
              <p className="text-sm text-muted py-8 text-center">
                Upload a CSV (or download the template) to preview graduates here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-faint border-b border-line">
                    <tr>
                      <th className="text-left py-2 pr-4">Student</th>
                      <th className="text-left py-2 pr-4">ID</th>
                      <th className="text-left py-2 pr-4">Program</th>
                      <th className="text-left py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-elevated transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-fg">{r.studentName}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-muted">{r.studentId}</td>
                        <td className="py-2.5 pr-4 text-muted">{r.program}</td>
                        <td className="py-2.5 pr-4">
                          {STATUS[r._status]}
                          {r._hash && <span className="block font-mono text-[10px] text-accent/60 mt-0.5">{r._hash.slice(0, 18)}…</span>}
                          {r._error && <span className="block text-[10px] text-red-500 mt-0.5">{r._error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
