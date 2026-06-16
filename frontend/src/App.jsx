/**
 * App.jsx — Root router.
 *
 * Public (no auth):
 *   /              — marketing landing page
 *   /verify-degree — public no-login degree verifier
 *   /login         — institution sign in
 *
 * Authenticated (Sidebar shell + page transitions):
 *   /dashboard  — all roles
 *   /issue      — university
 *   /verify     — employer (official on-chain verification)
 *   /logs       — university + admin
 *   /reports    — admin
 *   /admin      — admin
 */
import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar         from "./components/Sidebar";
import Logo            from "./components/Logo";
import Landing         from "./pages/Landing";
import PublicVerify    from "./pages/PublicVerify";
import Explorer        from "./pages/Explorer";
import Apply           from "./pages/Apply";
import Requests        from "./pages/Requests";
import StudentPortal   from "./pages/StudentPortal";
import StudentRegister from "./pages/StudentRegister";
import MyCredentials   from "./pages/MyCredentials";
import LoginPage       from "./pages/LoginPage";
import Dashboard       from "./pages/Dashboard";
import IssueDegree     from "./pages/IssueDegree";
import BulkIssue       from "./pages/BulkIssue";
import VerifyDegree    from "./pages/VerifyDegree";
import TransactionLogs from "./pages/TransactionLogs";
import Reports         from "./pages/Reports";
import AdminPanel      from "./pages/AdminPanel";

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}

function PrivateRoute({ children, roles }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    // students have their own home; everyone else uses the dashboard
    return <Navigate to={user.role === "student" ? "/my-credentials" : "/dashboard"} replace />;
  }
  return children;
}

/** Fades + slides each authenticated page on route change. */
function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Wraps authenticated pages with the sidebar shell.
 *  Desktop: static sidebar. Mobile (<lg): a top bar with a hamburger that
 *  slides the sidebar in as an overlay drawer. */
function AppShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 h-14 px-4 border-b border-line-soft bg-sidebar shrink-0">
          <button onClick={() => setNavOpen(true)} aria-label="Open menu" data-testid="open-nav"
            className="w-9 h-9 -ml-1 flex items-center justify-center rounded-lg text-fg hover:bg-fg/5 transition-colors">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Logo size={28} textClass="text-fg text-sm" />
        </div>
        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"              element={<Landing />} />
      <Route path="/verify-degree" element={<PublicVerify />} />
      <Route path="/explorer"      element={<Explorer />} />
      <Route path="/apply"         element={<Apply />} />
      <Route path="/student"        element={<StudentPortal />} />
      <Route path="/student-signup" element={<StudentRegister />} />
      <Route path="/login"          element={<LoginPage />} />

      {/* ── All authenticated roles ── */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <AppShell><Dashboard /></AppShell>
        </PrivateRoute>
      } />

      {/* ── University only ── */}
      <Route path="/issue" element={
        <PrivateRoute roles={["university"]}>
          <AppShell><IssueDegree /></AppShell>
        </PrivateRoute>
      } />
      <Route path="/bulk-issue" element={
        <PrivateRoute roles={["university"]}>
          <AppShell><BulkIssue /></AppShell>
        </PrivateRoute>
      } />
      <Route path="/requests" element={
        <PrivateRoute roles={["university", "admin"]}>
          <AppShell><Requests /></AppShell>
        </PrivateRoute>
      } />
      <Route path="/my-credentials" element={
        <PrivateRoute roles={["student"]}>
          <AppShell><MyCredentials /></AppShell>
        </PrivateRoute>
      } />

      {/* ── Employer only ── */}
      <Route path="/verify" element={
        <PrivateRoute roles={["employer"]}>
          <AppShell><VerifyDegree /></AppShell>
        </PrivateRoute>
      } />

      {/* ── University + admin ── */}
      <Route path="/logs" element={
        <PrivateRoute roles={["university", "admin"]}>
          <AppShell><TransactionLogs /></AppShell>
        </PrivateRoute>
      } />

      {/* ── Admin only ── */}
      <Route path="/reports" element={
        <PrivateRoute roles={["admin"]}>
          <AppShell><Reports /></AppShell>
        </PrivateRoute>
      } />
      <Route path="/admin" element={
        <PrivateRoute roles={["admin"]}>
          <AppShell><AdminPanel /></AppShell>
        </PrivateRoute>
      } />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
