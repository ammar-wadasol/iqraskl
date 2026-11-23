"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Native <dialog>: focus trap, Esc to close and backdrop come from the browser.
// Children mount only while open, so form state starts fresh each time.
const SIZES = { md: "max-w-lg", lg: "max-w-2xl" };

export default function Modal({ open, onClose, title, size = "md", children }) {
  const dialogRef = useRef(null);
  const closingFromCleanup = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      // Runs when closed via state, or when the route is hidden by navigation.
      if (dialog.open) {
        closingFromCleanup.current = true;
        dialog.close();
      }
    };
  }, [open]);

  function handleClose() {
    if (closingFromCleanup.current) {
      closingFromCleanup.current = false;
      return;
    }
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-2rem)] ${SIZES[size]} rounded-xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40`}
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
