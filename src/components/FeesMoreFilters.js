"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Form from "next/form";
import { SlidersHorizontal } from "lucide-react";

export default function FeesMoreFilters({ filters, year }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const onDocumentPointer = useEffectEvent((event) => {
    if (!rootRef.current?.contains(event.target)) setOpen(false);
  });

  const onDocumentKey = useEffectEvent((event) => {
    if (event.key === "Escape") setOpen(false);
  });

  useEffect(() => {
    if (!open) return;
    document.addEventListener("pointerdown", onDocumentPointer);
    document.addEventListener("keydown", onDocumentKey);
    return () => {
      document.removeEventListener("pointerdown", onDocumentPointer);
      document.removeEventListener("keydown", onDocumentKey);
    };
  }, [open]);

  // Close after Apply navigates and the URL filters change.
  const filterKey = `${filters.status}|${filters.name}|${filters.studentId}|${filters.fatherName}|${filters.unpaidMonth ?? ""}|${year}`;
  const filterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (filterKeyRef.current !== filterKey) {
      filterKeyRef.current = filterKey;
      setOpen(false);
    }
  }, [filterKey]);

  const statusLabel =
    filters.status === "active" ? "Active" : filters.status === "left" ? "Left" : "All";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`btn ${open ? "border-emerald-600 bg-emerald-50 text-emerald-900" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Year and status filters"
        title="Year and status"
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        <span className="text-xs">
          {statusLabel} · {year}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Year and status filters"
          className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <Form
            action="/fees"
            className="space-y-3"
            onSubmit={() => setOpen(false)}
          >
            {filters.name ? <input type="hidden" name="name" value={filters.name} /> : null}
            {filters.studentId ? (
              <input type="hidden" name="studentId" value={filters.studentId} />
            ) : null}
            {filters.fatherName ? (
              <input type="hidden" name="fatherName" value={filters.fatherName} />
            ) : null}
            {filters.unpaidMonth ? (
              <input type="hidden" name="unpaidMonth" value={filters.unpaidMonth} />
            ) : null}
            <div>
              <label htmlFor="mf-status" className="label">Status</label>
              <select id="mf-status" name="status" defaultValue={filters.status} className="input">
                <option value="active">Active</option>
                <option value="left">Left school</option>
                <option value="all">All</option>
              </select>
            </div>
            <div>
              <label htmlFor="mf-year" className="label">Year</label>
              <input
                id="mf-year"
                name="year"
                type="number"
                min={2000}
                max={2100}
                step={1}
                required
                defaultValue={year}
                className="input"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Apply
            </button>
          </Form>
        </div>
      )}
    </div>
  );
}
