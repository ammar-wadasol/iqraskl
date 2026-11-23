"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

// Submit button for a parent <form> that asks before submitting.
export default function ConfirmButton({ message, children }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
      {pending ? "Removing…" : children}
    </button>
  );
}
