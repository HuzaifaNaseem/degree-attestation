/**
 * DegreeForm — university issues a degree on-chain.
 * Endpoint: POST /api/degrees/issue
 * Includes studentId (non-sensitive, on-chain) + nationalId (PII, encrypted off-chain).
 */
import { useState } from "react";
import api         from "../api/axiosClient";
import Button      from "./ui/Button";
import FormField, { inputCls } from "./ui/FormField";
import Toast       from "./ui/Toast";

const INITIAL = {
  studentName: "", studentId: "", program: "",
  graduationDate: "", nationalId: "", dob: "", gpa: "", privateKey: "",
};

export default function DegreeForm({ onSuccess }) {
  const [form, setForm]     = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const { data } = await api.post("/degrees/issue", {
        ...form,
        graduationDate: Math.floor(new Date(form.graduationDate).getTime() / 1000),
      });
      setToast({
        type: "success",
        message: `Degree issued on-chain ✓  Hash: ${data.degree.degreeHash.slice(0, 20)}…  (${data.txTimeMs}ms)`,
      });
      setForm(INITIAL);
      onSuccess?.();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.error || err.response?.data?.reason || "Issuance failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <form onSubmit={handleSubmit} data-testid="degree-form" className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Student Full Name" required htmlFor="studentName">
            <input
              id="studentName" type="text" required
              data-testid="input-studentName"
              value={form.studentName} onChange={set("studentName")}
              placeholder="e.g. Ali Hassan"
              className={inputCls}
            />
          </FormField>

          <FormField label="Student ID" hint="Non-sensitive reg number — stored on-chain" required htmlFor="studentId">
            <input
              id="studentId" type="text" required
              data-testid="input-studentId"
              value={form.studentId} onChange={set("studentId")}
              placeholder="e.g. IU-2024-001"
              className={inputCls}
            />
          </FormField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Degree Program" required htmlFor="program">
            <input
              id="program" type="text" required
              data-testid="input-program"
              value={form.program} onChange={set("program")}
              placeholder="e.g. BSCS, BSCE"
              className={inputCls}
            />
          </FormField>

          <FormField label="Graduation Date" required htmlFor="graduationDate">
            <input
              id="graduationDate" type="date" required
              data-testid="input-graduationDate"
              value={form.graduationDate} onChange={set("graduationDate")}
              className={inputCls}
            />
          </FormField>
        </div>

        <FormField
          label="National ID (PII)"
          hint="AES-256 encrypted in MongoDB — never sent to blockchain"
          required
          htmlFor="nationalId"
        >
          <input
            id="nationalId" type="text" required
            data-testid="input-nationalId"
            value={form.nationalId} onChange={set("nationalId")}
            placeholder="42101-1234567-1"
            className={inputCls}
          />
        </FormField>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Date of Birth (optional)" htmlFor="dob">
            <input
              id="dob" type="date"
              data-testid="input-dob"
              value={form.dob} onChange={set("dob")}
              className={inputCls}
            />
          </FormField>

          <FormField label="GPA (optional)" htmlFor="gpa">
            <input
              id="gpa" type="text"
              data-testid="input-gpa"
              value={form.gpa} onChange={set("gpa")}
              placeholder="e.g. 3.8"
              className={inputCls}
            />
          </FormField>
        </div>

        <FormField
          label="University Wallet Private Key"
          hint="Used to sign the blockchain transaction — never stored by the server"
          required
          htmlFor="privateKey"
        >
          <input
            id="privateKey" type="password" required
            data-testid="input-privateKey"
            value={form.privateKey} onChange={set("privateKey")}
            placeholder="0x…"
            className={`${inputCls} font-mono`}
          />
        </FormField>

        <Button type="submit" loading={loading} data-testid="submit-issue" className="w-full">
          {loading ? "Issuing on-chain…" : "Issue Degree"}
        </Button>
      </form>
    </>
  );
}
