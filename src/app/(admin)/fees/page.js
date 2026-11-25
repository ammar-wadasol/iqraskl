import { Suspense } from "react";
import Link from "next/link";
import FeesMonthPay from "@/components/FeesMonthPay";
import FeesToolbar from "@/components/FeesToolbar";
import Loading from "@/components/Loading";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE, getFeeCalendar, parseFeeFilters } from "@/lib/data";
import { getToday } from "@/lib/dates";
import { MONTHS, formatMoney, formatMoneyCompact, monthLabel } from "@/lib/format";
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
      />
      <div className="card overflow-x-auto p-0">
        <table className="table-base w-max min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-36 bg-slate-50 !px-2 sm:w-44">Student</th>
              {MONTHS.map((m, i) => (
                <th
                  key={m}
                  className={`w-11 !px-0.5 text-center text-[10px] tracking-normal sm:w-12 ${
                    focusMonth === i + 1 ? "bg-emerald-50 text-emerald-900" : ""
                  }`}
                >
                  {m}
                </th>
              ))}
              <th className="sticky right-16 z-20 w-16 max-w-16 bg-slate-50 !px-1 text-right text-[10px] tracking-normal">
                Paid {year}
              </th>
              <th className="sticky right-0 z-20 w-16 max-w-16 bg-slate-50 !px-1 text-right text-[10px] tracking-normal">
                Pending {year}
              </th>
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
                <td className="sticky left-0 z-10 bg-white !px-2">
                  <Link
                    href={`/students/${s.id}?year=${year}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {s.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    <span className="font-mono">{s.studentId}</span> · {s.fatherName}
                  </p>
                </td>
                {s.months.map((m, i) => (
                  <td
                    key={MONTHS[i]}
                    className={`!px-0.5 !py-1.5 ${focusMonth === i + 1 ? "bg-emerald-50/50" : ""}`}
                  >
                    <FeesMonthPay
                      status={m}
                      studentId={s.id}
                      studentName={s.name}
                      monthlyFee={s.monthlyFee}
                      payMonth={`${year}-${String(i + 1).padStart(2, "0")}`}
                      today={today.iso}
                      title={`${s.name} · ${monthLabel(year, i + 1)}: paid ${formatMoney(m.paid)} of ${formatMoney(m.due)}`}
                    />
                  </td>
                ))}
                <td
                  className="sticky right-16 z-10 w-16 max-w-16 bg-white !px-1 text-right text-[11px] whitespace-nowrap text-emerald-700"
                  title={formatMoney(s.yearPaid)}
                >
                  {formatMoneyCompact(s.yearPaid)}
                </td>
                <td
                  className="sticky right-0 z-10 w-16 max-w-16 bg-white !px-1 text-right text-[11px] whitespace-nowrap text-red-700"
                  title={formatMoney(s.yearPending)}
                >
                  {formatMoneyCompact(s.yearPending)}
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
