/**
 * ChainStatus — live blockchain status widget.
 * Polls GET /api/public/chain-status and shows network, current block height,
 * and a pulsing connection indicator. Proves the app talks to a real chain.
 *
 * variant="badge"  → compact inline pill (sidebar / nav)
 * variant="card"   → full panel (landing page)
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axiosClient";

function useChainStatus(pollMs = 5000) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    const fetchStatus = async () => {
      try {
        const { data } = await api.get("/public/chain-status");
        if (alive) setStatus(data);
      } catch {
        if (alive) setStatus({ online: false });
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [pollMs]);

  return status;
}

function Dot({ online }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {online && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? "bg-emerald-400" : "bg-red-500"}`} />
    </span>
  );
}

export default function ChainStatus({ variant = "badge" }) {
  const status = useChainStatus();
  const online = status?.online;

  if (variant === "badge") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-elevated border border-line px-3 py-1.5">
        <Dot online={online} />
        <span className="text-xs text-muted">
          {online ? (
            <>Chain live · <span className="font-mono text-accent/80">#{status.blockNumber}</span></>
          ) : status ? "Chain offline" : "Connecting…"}
        </span>
      </div>
    );
  }

  // variant === "card"
  const rows = [
    { label: "Network",  value: online ? status.networkName : "—" },
    { label: "Chain ID", value: online ? status.chainId : "—" },
    { label: "Block",    value: online ? `#${status.blockNumber}` : "—", mono: true },
    { label: "Contract", value: online ? `${status.contractAddress.slice(0, 10)}…${status.contractAddress.slice(-6)}` : "—", mono: true },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface/80 backdrop-blur p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-faint">Network Status</p>
        <div className="flex items-center gap-2">
          <Dot online={online} />
          <span className={`text-xs font-semibold ${online ? "text-emerald-500" : "text-red-500"}`}>
            {online ? "Connected" : status ? "Offline" : "…"}
          </span>
        </div>
      </div>
      <dl className="space-y-2.5">
        {rows.map(({ label, value, mono }) => (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={`text-xs ${mono ? "font-mono text-accent/80" : "font-semibold text-fg"}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
