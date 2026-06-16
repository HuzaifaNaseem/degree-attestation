/**
 * AdminPanel — manage user accounts and on-chain roles.
 * Endpoints:
 *   GET  /admin/users
 *   POST /admin/grant-university
 *   POST /admin/grant-employer
 *   POST /auth/register
 */
import { useEffect, useState } from "react";
import api        from "../api/axiosClient";
import Card       from "../components/ui/Card";
import Badge      from "../components/ui/Badge";
import Button     from "../components/ui/Button";
import Spinner    from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Toast      from "../components/ui/Toast";
import FormField, { inputCls } from "../components/ui/FormField";

const ROLE_VARIANT = { admin: "info", university: "neutral", employer: "valid" };

export default function AdminPanel() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [grantAddr, setGrantAddr] = useState("");
  const [granting,  setGranting]  = useState("");

  const [reg, setReg] = useState({ name: "", email: "", password: "", role: "university", walletAddress: "" });
  const [registering, setRegistering] = useState(false);

  const setR = (k) => (e) => setReg((f) => ({ ...f, [k]: e.target.value }));

  const me = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  async function loadUsers() {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  async function grantRole() {
    if (!grantAddr.startsWith("0x")) {
      setToast({ type: "error", message: "Wallet address must start with 0x" });
      return;
    }
    setGranting("university");
    try {
      const { data } = await api.post("/admin/grant-university", { walletAddress: grantAddr });
      setToast({ type: "success", message: `University role granted. TX: ${data.txHash?.slice(0, 20)}…` });
      setGrantAddr("");
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Grant failed" });
    } finally { setGranting(""); }
  }

  async function deleteUser(u) {
    if (!window.confirm(`Delete ${u.email}? This permanently removes their account.`)) return;
    try {
      await api.delete(`/admin/users/${u._id}`);
      setToast({ type: "success", message: `Deleted ${u.email}` });
      loadUsers();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Delete failed" });
    }
  }

  async function registerUser(e) {
    e.preventDefault();
    setRegistering(true);
    try {
      await api.post("/auth/register", reg);
      setToast({ type: "success", message: `User ${reg.email} registered as ${reg.role}` });
      setReg({ name: "", email: "", password: "", role: "university", walletAddress: "" });
      loadUsers();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Registration failed" });
    } finally { setRegistering(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg tracking-tight">User & Role Management</h1>
        <p className="text-sm text-muted mt-1">Register accounts and grant on-chain roles.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Register user */}
        <Card title="Register New User" subtitle="Creates a JWT account">
          <form onSubmit={registerUser} data-testid="register-form" className="space-y-3">
            <FormField label="Full Name" required htmlFor="reg-name">
              <input id="reg-name" type="text" required value={reg.name} onChange={setR("name")}
                data-testid="input-reg-name" placeholder="Iqra University" className={inputCls} />
            </FormField>
            <FormField label="Email" required htmlFor="reg-email">
              <input id="reg-email" type="email" required value={reg.email} onChange={setR("email")}
                data-testid="input-reg-email" placeholder="uni@iqra.edu.pk" className={inputCls} />
            </FormField>
            <FormField label="Password" required htmlFor="reg-password">
              <input id="reg-password" type="password" required value={reg.password} onChange={setR("password")}
                data-testid="input-reg-password" placeholder="Min 8 chars" className={inputCls} />
            </FormField>
            <FormField label="Role" required htmlFor="reg-role">
              <select id="reg-role" value={reg.role} onChange={setR("role")}
                data-testid="select-reg-role" className={inputCls}>
                <option value="university">University</option>
                <option value="admin">Admin</option>
              </select>
            </FormField>
            <FormField label="Wallet Address" required htmlFor="reg-wallet">
              <input id="reg-wallet" type="text" required value={reg.walletAddress} onChange={setR("walletAddress")}
                data-testid="input-reg-wallet" placeholder="0x…" className={`${inputCls} font-mono`} />
            </FormField>
            <Button type="submit" loading={registering} data-testid="submit-register" className="w-full">
              Register User
            </Button>
          </form>
        </Card>

        {/* Grant on-chain role */}
        <Card title="Grant On-Chain Role" subtitle="Signs tx with deployer wallet → AccessControl">
          <div className="space-y-4">
            <FormField label="Wallet Address" required htmlFor="grant-addr">
              <input
                id="grant-addr" type="text"
                data-testid="input-grant-addr"
                value={grantAddr}
                onChange={(e) => setGrantAddr(e.target.value)}
                placeholder="0x…"
                className={`${inputCls} font-mono`}
              />
            </FormField>
            <Button onClick={grantRole} loading={granting === "university"} data-testid="btn-grant-university" className="w-full">
              Grant UNIVERSITY_ROLE
            </Button>
            <p className="text-xs text-faint leading-relaxed">
              The deployer wallet (<code className="text-accent/80 font-mono text-xs">DEPLOYER_PRIVATE_KEY</code> in .env) signs the transaction automatically.
            </p>
          </div>
        </Card>
      </div>

      {/* Users table */}
      <Card title="All Users" subtitle={`${users.length} registered accounts`}>
        {loading ? <Spinner /> : users.length === 0 ? (
          <EmptyState title="No users yet" icon="👤" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" data-testid="users-table">
              <thead className="text-xs uppercase tracking-wider text-faint border-b border-line">
                <tr>
                  {["", "Name", "Email", "Role", "Wallet", "Active", "Joined", "Actions"].map((h) => (
                    <th key={h} className="text-left py-3 pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {users.map((u) => (
                  <tr key={u._id} data-testid="user-row" className="hover:bg-elevated transition-colors">
                    <td className="py-3 pr-3">
                      <div className="w-8 h-8 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center border border-accent/25">
                        {u.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    </td>
                    <td className="py-3 pr-6 font-semibold text-fg">{u.name}</td>
                    <td className="py-3 pr-6 text-muted">{u.email}</td>
                    <td className="py-3 pr-6">
                      <Badge variant={ROLE_VARIANT[u.role] ?? "neutral"}>{u.role}</Badge>
                    </td>
                    <td className="py-3 pr-6 font-mono text-xs text-accent/60">
                      {u.walletAddress?.slice(0, 12)}…
                    </td>
                    <td className="py-3 pr-6">
                      <Badge variant={u.isActive ? "valid" : "neutral"}>{u.isActive ? "Yes" : "No"}</Badge>
                    </td>
                    <td className="py-3 pr-6 text-xs text-faint">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      {me && String(me._id) === String(u._id) ? (
                        <span className="text-xs text-faint">You</span>
                      ) : (
                        <button onClick={() => deleteUser(u)} data-testid="delete-user"
                          className="text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 rounded-lg px-2.5 py-1 transition-colors">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
