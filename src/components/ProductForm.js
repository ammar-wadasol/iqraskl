"use client";

import { PackagePlus } from "lucide-react";
import { createProduct } from "@/app/actions/products";
import { useFormAction } from "./useFormAction";

export default function ProductForm({ onCancel }) {
  const { state, pending, formRef, onSubmit } = useFormAction(createProduct);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="pf-name" className="label">Item name</label>
        <input
          id="pf-name"
          name="name"
          required
          maxLength={100}
          autoFocus
          className="input"
          placeholder="e.g. Uniform, Books, Notebook"
          list="product-suggestions"
        />
        <datalist id="product-suggestions">
          <option value="Uniform" />
          <option value="Books" />
          <option value="Notebook" />
          <option value="Bag" />
          <option value="Stationery kit" />
        </datalist>
      </div>
      <div>
        <label htmlFor="pf-description" className="label">Description (optional)</label>
        <input id="pf-description" name="description" maxLength={200} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-unitPrice" className="label">Unit price (Rs)</label>
          <input
            id="pf-unitPrice"
            name="unitPrice"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={0}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="pf-stock" className="label">Opening stock</label>
          <input
            id="pf-stock"
            name="stock"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={0}
            className="input"
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn">Cancel</button>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          <PackagePlus className="size-4" aria-hidden="true" />
          {pending ? "Saving…" : "Add item"}
        </button>
      </div>
    </form>
  );
}
