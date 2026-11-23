"use client";

import { PackagePlus } from "lucide-react";
import { addStock } from "@/app/actions/products";
import { useFormAction } from "./useFormAction";

export default function AddStockForm({ productId, onSuccess, onCancel }) {
  const { state, pending, formRef, onSubmit } = useFormAction(addStock, { onSuccess });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="product" value={productId} />
      <div>
        <label htmlFor="as-quantity" className="label">Quantity to add</label>
        <input
          id="as-quantity"
          name="quantity"
          type="number"
          min={1}
          step={1}
          required
          autoFocus
          defaultValue={1}
          className="input"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn">Cancel</button>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          <PackagePlus className="size-4" aria-hidden="true" />
          {pending ? "Saving…" : "Add stock"}
        </button>
      </div>
    </form>
  );
}
