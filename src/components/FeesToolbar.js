import Form from "next/form";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import FeesMoreFilters from "@/components/FeesMoreFilters";
import { MONTHS, monthLabel } from "@/lib/format";

function feesHref({ filters, year, unpaidMonth }) {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.studentId) params.set("studentId", filters.studentId);
  if (filters.fatherName) params.set("fatherName", filters.fatherName);
  if (filters.status) params.set("status", filters.status);
  params.set("year", String(year));
  if (unpaidMonth) params.set("unpaidMonth", String(unpaidMonth));
  const qs = params.toString();
  return qs ? `/fees?${qs}` : "/fees";
}

function shiftMonth(year, month, delta) {
  const index = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

export default function FeesToolbar({ filters, year, focusMonth, unpaidCount, legend }) {
  const prev = shiftMonth(year, focusMonth, -1);
  const next = shiftMonth(year, focusMonth, 1);
  const clearHref = feesHref({
    filters: { name: "", studentId: "", fatherName: "", status: "active" },
    year,
    unpaidMonth: null,
  });
  const allMonthsHref = feesHref({ filters, year, unpaidMonth: null });
  const resetKey = JSON.stringify({ filters, year });

  return (
    <div className="space-y-4">
      <Form
        key={resetKey}
        action="/fees"
        className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="status" value={filters.status} />
        {filters.unpaidMonth ? (
          <input type="hidden" name="unpaidMonth" value={filters.unpaidMonth} />
        ) : null}
        <div>
          <label htmlFor="f-name" className="label">Student name</label>
          <input id="f-name" name="name" defaultValue={filters.name} className="input" placeholder="Search name" />
        </div>
        <div>
          <label htmlFor="f-sid" className="label">Student ID</label>
          <input
            id="f-sid"
            name="studentId"
            defaultValue={filters.studentId}
            className="input"
            placeholder="Search ID"
          />
        </div>
        <div>
          <label htmlFor="f-father" className="label">Father name</label>
          <input
            id="f-father"
            name="fatherName"
            defaultValue={filters.fatherName}
            className="input"
            placeholder="Search father name"
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary flex-1">
            <Search className="size-4" aria-hidden="true" />
            Search
          </button>
          <Link href={clearHref} className="btn" aria-label="Clear filters" title="Clear filters">
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Link
            href={feesHref({ filters, year: prev.year, unpaidMonth: prev.month })}
            className="btn min-w-0 px-2 sm:min-w-24 sm:px-3"
            title={`Unpaid in ${monthLabel(prev.year, prev.month)}`}
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
            <span>{MONTHS[prev.month - 1]}</span>
          </Link>

          <div className="min-w-40 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-center">
            <p className="text-sm font-semibold text-emerald-900">
              {MONTHS[focusMonth - 1]} {year}
            </p>
            <p className="text-[11px] text-emerald-700">
              {filters.unpaidMonth
                ? `${unpaidCount} unpaid / partial`
                : "Current month"}
            </p>
          </div>

          <Link
            href={feesHref({ filters, year: next.year, unpaidMonth: next.month })}
            className="btn min-w-0 px-2 sm:min-w-24 sm:px-3"
            title={`Unpaid in ${monthLabel(next.year, next.month)}`}
          >
            <span>{MONTHS[next.month - 1]}</span>
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>

          {filters.unpaidMonth ? (
            <Link href={allMonthsHref} className="btn text-xs">
              Show all
            </Link>
          ) : (
            <Link
              href={feesHref({ filters, year, unpaidMonth: focusMonth })}
              className="btn text-xs"
            >
              Unpaid only
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {legend}
          <FeesMoreFilters filters={filters} year={year} />
        </div>
      </div>
    </div>
  );
}
