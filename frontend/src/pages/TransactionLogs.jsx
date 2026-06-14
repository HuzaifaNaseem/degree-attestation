/**
 * TransactionLogs — paginated audit log with filter.
 * Accessible by: admin, university.
 * Endpoint: GET /reports/audit?page=&limit=&type=
 */
import { useState } from "react";
import AuditTable from "../components/AuditTable";
import Card       from "../components/ui/Card";
import { inputCls } from "../components/ui/FormField";

const EVENT_TYPES = [
  { value: "",                    label: "All Events"        },
  { value: "DEGREE_ISSUED",       label: "Degree Issued"     },
  { value: "DEGREE_VERIFIED",     label: "Degree Verified"   },
  { value: "DEGREE_REVOKED",      label: "Degree Revoked"    },
  { value: "FRAUD_ATTEMPT",       label: "Fraud Attempts"    },
  { value: "AUTH_LOGIN",          label: "Auth Logins"       },
  { value: "AUTH_FAILURE",        label: "Auth Failures"     },
  { value: "UNAUTHORIZED_ACCESS", label: "Unauthorized"      },
];

export default function TransactionLogs() {
  const [filterType, setFilterType] = useState("");

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted mt-1">
            All on-chain events and system activity — append-only, mirrors the blockchain.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-faint uppercase tracking-wider">Filter</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            data-testid="filter-type"
            className={`${inputCls} w-auto`}
          >
            {EVENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <AuditTable filterType={filterType || undefined} />
      </Card>
    </div>
  );
}
