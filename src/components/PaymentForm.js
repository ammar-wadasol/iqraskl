"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { recordPayment } from "@/app/actions/fees";
import { formatMoney } from "@/lib/format";
import { useFormAction } from "./useFormAction";

export default function PaymentForm({ studentId, today, defaultMonth, charges, onSuccess, onCancel }) {
  const { state, pending, formRef, onSubmit } = useFormAction(recordPayment, { onSuccess });
  const [target, setTarget] = useState("monthly");
  const openCharges = charges.filter((c) => c.amountDue > c.amountPaid);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="student" value={studentId} />
      <div>
        <label htmlFor="pf-target" className="label">Payment for</label>
        <select
          id="pf-target"
          name="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="input"
        >
          <option value="monthly">Monthly fee</option>
          {openCharges.map((c) => (
            <option key={c.id} value={`record:${c.id}`}>
              {c.description || "Admission fee"} — {formatMoney(c.amountDue - c.amountPaid)} remaining
            </option>
          ))}
        </select>
      </div>
      {target === "monthly" && (
        <div>
          <label htmlFor="pf-month" className="label">Month</label>
          <input
            id="pf-month"
            name="month"
            type="month"
            required
            defaultValue={defaultMonth}
            className="input"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-amount" className="label">Amount (Rs)</label>
          <input id="pf-amount" name="amount" type="number" min={0} step={1} required autoFocus className="input" />
        </div>
        <div>
          <label htmlFor="pf-paidOn" className="label">Paid on</label>
          <input id="pf-paidOn" name="paidOn" type="date" required defaultValue={today} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="pf-note" className="label">Note (optional)</label>
        <input id="pf-note" name="note" maxLength={200} className="input" placeholder="e.g. Receipt #123" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn">Cancel</button>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Wallet className="size-4" aria-hidden="true" />
          {pending ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
