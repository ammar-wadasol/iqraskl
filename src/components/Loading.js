export default function Loading({ label = "Loading…" }) {
  return (
    <div className="card animate-pulse py-10 text-center text-sm text-slate-500">{label}</div>
  );
}
