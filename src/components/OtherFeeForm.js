"use client";

import { Plus } from "lucide-react";
import { addOtherFee } from "@/app/actions/fees";
import { useFormAction } from "./useFormAction";

export default function OtherFeeForm({ studentId, today, onSuccess, onCancel }) {
  const { state, pending, formRef, onSubmit } = useFormAction(addOtherFee, { onSuccess });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="student" value={studentId} />
      <p className="text-xs text-slate-500">Books, uniform, stationery or any extra charge.</p>
      <div>
        <label htmlFor="of-description" className="label">Description</label>
        <input
          id="of-description"
          name="description"
          required
          autoFocus
          maxLength={100}
          list="of-suggestions"
          className="input"
          placeholder="e.g. Books, Uniform, Exam fee"
        />
        <datalist id="of-suggestions">
          <option value="Books" />
          <option value="Uniform" />
          <option value="Stationery" />
          <option value="Exam fee" />
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="of-amountDue" className="label">Fee amount (Rs)</label>
          <input id="of-amountDue" name="amountDue" type="number" min={0} step={1} required className="input" />
        </div>
        <div>
          <label htmlFor="of-paidNow" className="label">Paid now (Rs)</label>
          <input id="of-paidNow" name="paidNow" type="number" min={0} step={1} required defaultValue={0} className="input" />
        </div>
      </div>
      <input type="hidden" name="paidOn" value={today} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn">Cancel</button>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {pending ? "Saving…" : "Add fee"}
        </button>
      </div>
    </form>
  );
}
