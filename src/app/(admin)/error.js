"use client";

export default function AdminError({ error, reset }) {
  return (
    <div className="card space-y-3">
      <h2 className="font-semibold text-red-700">Something went wrong</h2>
      <p className="text-sm text-slate-600">
        The data could not be loaded. Check the database connection and try again.
        {error?.digest && <span className="block text-xs text-slate-400">Reference: {error.digest}</span>}
      </p>
      <button type="button" onClick={reset} className="btn">Try again</button>
    </div>
  );
}
