import Link from "next/link";
import { formatMoney } from "@/lib/format";

const STYLES = {
  paid: "bg-emerald-100 text-emerald-900 border-emerald-200",
  partial: "bg-amber-100 text-amber-900 border-amber-200",
  unpaid: "bg-red-100 text-red-900 border-red-200",
  upcoming: "bg-white text-slate-500 border-slate-200",
  na: "bg-slate-100 text-slate-400 border-slate-100",
};

const LABELS = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  upcoming: "Upcoming",
  na: "—",
};

function cellAmount(status, compact) {
  const value = status.paid > 0 ? status.paid : status.due;
  if (compact) return String(value || 0);
  return formatMoney(value);
}

export function MonthCell({ status, href, title, scroll, compact = false }) {
  const content = (
    <>
      <span className={`block font-semibold ${compact ? "text-[9px]" : "text-[11px]"}`}>
        {LABELS[status.state]}
      </span>
      {status.state !== "na" && (
        <span className={`block ${compact ? "text-[9px]" : "text-[11px]"}`}>
          {cellAmount(status, compact)}
        </span>
      )}
    </>
  );
  const className = compact
    ? `block w-full min-w-0 rounded border px-0.5 py-0.5 text-center leading-tight ${STYLES[status.state]}`
    : `block min-w-[4.5rem] rounded border px-1.5 py-1 text-center leading-tight ${STYLES[status.state]}`;

  if (!href || status.state === "na") {
    return <div className={className} title={title}>{content}</div>;
  }
  return (
    <Link href={href} scroll={scroll} className={`${className} hover:ring-2 hover:ring-emerald-500/40`} title={title}>
      {content}
    </Link>
  );
}

export function MonthLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {["paid", "partial", "unpaid", "upcoming", "na"].map((state) => (
        <span key={state} className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded border ${STYLES[state]}`} />
          {state === "na" ? "Not enrolled" : LABELS[state]}
        </span>
      ))}
    </div>
  );
}
