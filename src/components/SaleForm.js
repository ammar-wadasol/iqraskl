"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Percent, ShoppingBag, X } from "lucide-react";
import { recordSale } from "@/app/actions/products";
import { formatMoney } from "@/lib/format";
import { useFormAction } from "./useFormAction";

function studentLabel(s) {
  return `${s.studentId} - ${s.name} / ${s.fatherName}`;
}

export default function SaleForm({ product, students, today, onSuccess, onCancel }) {
  const { state, pending, formRef, onSubmit } = useFormAction(recordSale, { onSuccess });
  const [quantity, setQuantity] = useState(1);
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  const total = product.unitPrice * (Number(quantity) || 0);
  const paid = Number(amountPaid) || 0;
  const waived = Number(discount) || 0;
  const remaining = Math.max(total - paid - waived, 0);

  const filtered = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [students, studentQuery]);

  const onDocumentPointer = useEffectEvent((event) => {
    if (!pickerRef.current?.contains(event.target)) setOpen(false);
  });

  useEffect(() => {
    if (!open) return;
    document.addEventListener("pointerdown", onDocumentPointer);
    return () => document.removeEventListener("pointerdown", onDocumentPointer);
  }, [open]);

  function waiveRemaining() {
    const afterPaid = Math.max(total - paid, 0);
    setShowDiscount(true);
    setDiscount(afterPaid);
  }

  function pickStudent(student) {
    setSelected(student);
    setStudentQuery(studentLabel(student));
    setOpen(false);
  }

  function clearStudent() {
    setSelected(null);
    setStudentQuery("");
    setOpen(true);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="product" value={product.id} />
      <input type="hidden" name="student" value={selected?.id ?? ""} />
      <input type="hidden" name="discount" value={showDiscount ? waived : 0} />
      <p className="text-sm text-slate-600">
        {product.name} · {formatMoney(product.unitPrice)} each · {product.stock} in stock
      </p>

      <div ref={pickerRef} className="relative">
        <label htmlFor="sf-student-search" className="label">Student</label>
        <div className="relative">
          <input
            id="sf-student-search"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="sf-student-list"
            aria-autocomplete="list"
            autoComplete="off"
            autoFocus
            required={!selected}
            value={studentQuery}
            onChange={(e) => {
              setStudentQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="input pr-9"
            placeholder="Type name, ID or father name"
          />
          {selected && (
            <button
              type="button"
              onClick={clearStudent}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Clear student"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {open && !selected && (
          <ul
            id="sf-student-list"
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No matching students</li>
            ) : (
              filtered.map((s) => (
                <li key={s.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
                    onClick={() => pickStudent(s)}
                  >
                    <span className="font-medium text-slate-900">
                      <span className="font-mono">{s.studentId}</span>
                      {" - "}
                      {s.name}
                      {" / "}
                      {s.fatherName}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">Class {s.className}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        {!selected && (
          <p className="mt-1 text-xs text-slate-500">Pick a student from the list to continue.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="sf-quantity" className="label">Quantity</label>
          <input
            id="sf-quantity"
            name="quantity"
            type="number"
            min={1}
            max={product.stock}
            step={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="sf-amountPaid" className="label">Amount paid (Rs)</label>
          <input
            id="sf-amountPaid"
            name="amountPaid"
            type="number"
            min={0}
            max={total}
            step={1}
            required
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
        <div>
          {showDiscount ? (
            <>
              <label htmlFor="sf-discount" className="label">Discount (Rs)</label>
              <input
                id="sf-discount"
                type="number"
                min={0}
                max={Math.max(total - paid, 0)}
                step={1}
                required
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="input"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={waiveRemaining}
              className="btn w-full"
              disabled={total - paid <= 0}
            >
              <Percent className="size-4" aria-hidden="true" />
              Add discount
            </button>
          )}
        </div>
        <div>
          <label htmlFor="sf-soldOn" className="label">Sold on</label>
          <input id="sf-soldOn" name="soldOn" type="date" required defaultValue={today} className="input" />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Total</span>
          <span className="font-medium">{formatMoney(total)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Paid</span>
          <span className="font-medium text-emerald-700">{formatMoney(paid)}</span>
        </div>
        {waived > 0 && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Discount</span>
            <span className="font-medium">{formatMoney(waived)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between gap-2 border-t border-slate-200 pt-1">
          <span className="text-slate-500">Remaining</span>
          <span className={`font-medium ${remaining > 0 ? "text-red-700" : "text-emerald-700"}`}>
            {remaining > 0 ? formatMoney(remaining) : "Cleared"}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="sf-note" className="label">Note (optional)</label>
        <input id="sf-note" name="note" maxLength={200} className="input" placeholder="e.g. Size medium" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {!selected && state === null && (
        <p className="sr-only" aria-live="polite">Select a student before recording the sale.</p>
      )}
      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn">Cancel</button>
        )}
        <button
          type="submit"
          disabled={pending || product.stock < 1 || !selected}
          className="btn btn-primary"
        >
          <ShoppingBag className="size-4" aria-hidden="true" />
          {pending ? "Saving…" : "Record sale"}
        </button>
      </div>
    </form>
  );
}
