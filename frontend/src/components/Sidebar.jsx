/**
 * Sidebar — dark charcoal + gold accent navigation.
 * Role-based nav links, user card, sign out.
 */
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import ChainStatus from "./ChainStatus";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}

/* ── SVG icon set ─────────────────────────────────────────── */
const Icons = {
  Dashboard: () => (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Issue: () => (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Verify: () => (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Logs: () => (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Reports: () => (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

/* ── Role → nav links ─────────────────────────────────────── */
const ROLE_LINKS = {
  admin: [
    { to: "/dashboard", label: "Dashboard",  Icon: Icons.Dashboard },
    { to: "/requests",  label: "Requests",   Icon: Icons.Verify    },
    { to: "/logs",      label: "Audit Logs", Icon: Icons.Logs      },
    { to: "/reports",   label: "Reports",    Icon: Icons.Reports   },
    { to: "/admin",     label: "Users",      Icon: Icons.Users     },
  ],
  university: [
    { to: "/dashboard",  label: "Dashboard",    Icon: Icons.Dashboard },
    { to: "/requests",   label: "Requests",     Icon: Icons.Verify    },
    { to: "/issue",      label: "Issue Degree", Icon: Icons.Issue     },
    { to: "/bulk-issue", label: "Bulk Issue",   Icon: Icons.Users     },
    { to: "/logs",       label: "TX Logs",      Icon: Icons.Logs      },
  ],
  employer: [
    { to: "/dashboard", label: "Dashboard",     Icon: Icons.Dashboard },
    { to: "/verify",    label: "Verify Degree", Icon: Icons.Verify    },
  ],
  student: [
    { to: "/my-credentials", label: "My Credentials", Icon: Icons.Issue },
  ],
};

const ROLE_BADGE = {
  admin:      "bg-accent/15 text-accent border border-accent/30",
  university: "bg-violet-500/15 text-violet-500 border border-violet-500/30",
  employer:   "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
  student:    "bg-cyan-500/15 text-cyan-500 border border-cyan-500/30",
};

export default function Sidebar({ open = false, onClose = () => {} }) {
  const navigate  = useNavigate();
  const user      = getUser();
  const links     = ROLE_LINKS[user?.role] ?? [];

  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [delErr, setDelErr]         = useState("");

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  async function deleteAccount() {
    setDeleting(true); setDelErr("");
    try {
      await api.delete("/auth/account");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    } catch (e) {
      setDelErr(e.response?.data?.error || "Could not delete account. Please try again.");
      setDeleting(false);
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} aria-hidden />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col h-screen bg-sidebar border-r border-line-soft
        transform transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>

      {/* ── Logo (+ mobile close) ── */}
      <div className="px-5 py-5 border-b border-line-soft flex items-center justify-between">
        <Logo size={36} sub="Credential Platform" textClass="text-fg text-sm" />
        <button onClick={onClose} aria-label="Close menu"
          className="lg:hidden w-8 h-8 -mr-1 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-fg/5">✕</button>
      </div>

      {/* ── Role badge ── */}
      <div className="px-4 pt-4 pb-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-widest ${ROLE_BADGE[user?.role] ?? ROLE_BADGE.admin}`}>
          {user?.role ?? "—"}
        </span>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-accent border-l-2 border-accent pl-[10px]"
                  : "text-muted hover:text-fg hover:bg-fg/5 border-l-2 border-transparent"
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Theme switcher ── */}
      <div className="px-3 pt-3">
        <ThemeToggle />
      </div>

      {/* ── Live chain status ── */}
      <div className="px-3 pt-2">
        <ChainStatus variant="badge" />
      </div>

      {/* ── User card + sign out ── */}
      <div className="p-3 border-t border-line-soft mt-3 space-y-1.5">
        <div className="flex items-center gap-3 bg-elevated rounded-xl px-3 py-2.5 border border-line">
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0 border border-accent/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-fg text-xs font-semibold truncate">{user?.name ?? "User"}</p>
            <p className="text-faint text-xs font-mono truncate">
              {user?.walletAddress ? `${user.walletAddress.slice(0, 10)}…` : "—"}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          data-testid="btn-signout"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
        >
          <Icons.Logout />
          Sign Out
        </button>

        <button
          onClick={() => { setDelErr(""); setConfirmDel(true); }}
          data-testid="btn-delete-account"
          className="w-full text-center text-[11px] text-faint hover:text-red-500 transition-colors pt-1"
        >
          Delete account
        </button>
      </div>
      </aside>

      {/* ── Delete-account confirmation ── */}
      {confirmDel && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !deleting && setConfirmDel(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface border border-line rounded-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 text-2xl flex items-center justify-center mb-4">⚠</div>
            <h3 className="text-lg font-bold text-fg">Delete your account?</h3>
            <p className="text-sm text-muted mt-1.5">
              This permanently removes your login{user?.role === "student" ? "" : ` (${user?.role})`}. Any credentials already issued on-chain stay valid and verifiable — this only deletes your account access.
            </p>
            {delErr && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mt-3">{delErr}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDel(false)} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-elevated border border-line text-muted hover:text-fg disabled:opacity-50">
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={deleting} data-testid="confirm-delete-account"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
