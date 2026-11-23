import { Suspense } from "react";
import Link from "next/link";
import FeesToolbar from "@/components/FeesToolbar";
import Loading from "@/components/Loading";
import { MonthCell, MonthLegend } from "@/components/MonthCell";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE, getFeeCalendar, parseFeeFilters } from "@/lib/data";
import { getToday } from "@/lib/dates";
import { MONTHS, formatMoney, monthLabel } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Fees calendar · Iqra School Office" };

export default function FeesPage({ searchParams }) {
  return (
    <>
      <h1 className="text-xl font-semibold">Fees calendar</h1>
      <Suspense fallback={<Loading label="Loading fees…" />}>
        <FeesCalendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FeesCalendar({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseFeeFilters(sp);
  const today = getToday();
  const requestedYear = Number.parseInt(sp.year, 10);
  const year =
    requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : today.year;
  const focusMonth = filters.unpaidMonth ?? (year === today.year ? today.month : today.month);
  const { students, total, page, pageCount } = await getFeeCalendar(filters, year);

  const query = {
    ...filters,
    year,
    unpaidMonth: filters.unpaidMonth ?? "",
  };

  return (
    <>
      <FeesToolbar
        filters={filters}
        year={year}
        focusMonth={focusMonth}
        unpaidCount={filters.unpaidMonth ? total : null}
        legend={<MonthLegend />}
      />
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-48 bg-slate-50">Student</th>
              {MONTHS.map((m, i) => (
                <th
                  key={m}
                  className={`text-center ${
                    focusMonth === i + 1 ? "bg-emerald-50 text-emerald-900" : ""
                  }`}
                >
                  {m}
                </th>
              ))}
              <th className="text-right">Paid {year}</th>
              <th className="text-right">Pending {year}</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-500">
                  {filters.unpaidMonth
                    ? `No students unpaid for ${monthLabel(year, filters.unpaidMonth)}.`
                    : "No students match these filters."}
                </td>
              </tr>
            )}
            {students.map((s) => (
              <tr key={s.id}>
                <td className="sticky left-0 z-10 bg-white">
                  <Link
                    href={`/students/${s.id}?year=${year}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {s.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    <span className="font-mono">{s.studentId}</span> · {s.fatherName} · {s.className}
                  </p>
                </td>
                {s.months.map((m, i) => (
                  <td
                    key={MONTHS[i]}
                    className={`px-1 ${focusMonth === i + 1 ? "bg-emerald-50/50" : ""}`}
                  >
                    <MonthCell
                      status={m}
                      href={`/students/${s.id}?pay=${year}-${String(i + 1).padStart(2, "0")}`}
                      title={`${s.name} · ${monthLabel(year, i + 1)}: paid ${formatMoney(m.paid)} of ${formatMoney(m.due)}`}
                    />
                  </td>
                ))}
                <td className="text-right whitespace-nowrap text-emerald-700">
                  {formatMoney(s.yearPaid)}
                </td>
                <td className="text-right whitespace-nowrap text-red-700">
                  {formatMoney(s.yearPending)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        pathname="/fees"
        query={query}
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}
