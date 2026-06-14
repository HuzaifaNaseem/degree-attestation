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
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar         from "./components/Sidebar";
import Landing         from "./pages/Landing";
import PublicVerify    from "./pages/PublicVerify";
import LoginPage       from "./pages/LoginPage";
import Dashboard       from "./pages/Dashboard";
import IssueDegree     from "./pages/IssueDegree";
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
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
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

/** Wraps authenticated pages with the sidebar shell. */
function AppShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"              element={<Landing />} />
      <Route path="/verify-degree" element={<PublicVerify />} />
      <Route path="/login"         element={<LoginPage />} />

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
