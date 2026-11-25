import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, Printer, UserPlus, X } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import Loading from "@/components/Loading";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE, listStudents, parseFilters } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Students · Iqra School Office" };

const MONTH_BADGES = {
  paid: ["Paid", "bg-emerald-100 text-emerald-800"],
  partial: ["Partial", "bg-amber-100 text-amber-800"],
  unpaid: ["Unpaid", "bg-red-100 text-red-800"],
  upcoming: ["—", "bg-slate-100 text-slate-500"],
  na: ["—", "bg-slate-100 text-slate-500"],
};

function studentsHref(filters, { defaulters } = {}) {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.studentId) params.set("studentId", filters.studentId);
  if (filters.fatherName) params.set("fatherName", filters.fatherName);
  if (filters.className) params.set("className", filters.className);
  if (filters.status && filters.status !== "active") params.set("status", filters.status);
  const showDefaulters = defaulters ?? filters.defaulters;
  if (showDefaulters) params.set("defaulters", "1");
  const qs = params.toString();
  return qs ? `/students?${qs}` : "/students";
}

export default function StudentsPage({ searchParams }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Students</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <DefaultersToggle searchParams={searchParams} />
          </Suspense>
          <Link href="/students/new" className="btn btn-primary">
            <UserPlus className="size-4" aria-hidden="true" />
            Add student
          </Link>
        </div>
      </div>
      <Suspense fallback={<Loading label="Loading students…" />}>
        <StudentsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DefaultersToggle({ searchParams }) {
  const filters = parseFilters(await searchParams);
  if (filters.defaulters) {
    return (
      <Link
        href={studentsHref(filters, { defaulters: false })}
        className="btn border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
        title="Show all students"
      >
        <X className="size-4" aria-hidden="true" />
        Clear defaulters
      </Link>
    );
  }
  return (
    <Link
      href={studentsHref(filters, { defaulters: true })}
      className="btn border-red-200 text-red-800 hover:bg-red-50"
      title="Students with remaining fees"
    >
      <AlertTriangle className="size-4" aria-hidden="true" />
      Defaulters
    </Link>
  );
}

async function StudentsList({ searchParams }) {
  await requireAdmin();
  const filters = parseFilters(await searchParams);
  const { students, total, page, pageCount } = await listStudents(filters);
  const printHref = filters.className
    ? `/students/class-list/pdf?className=${encodeURIComponent(filters.className)}&status=${encodeURIComponent(filters.status)}`
    : null;

  const paginationQuery = {
    ...filters,
    defaulters: filters.defaulters ? "1" : "",
  };

  return (
    <>
      <FilterBar action="/students" filters={filters} />
      {filters.defaulters && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-100 bg-red-50/70 px-3 py-2 text-sm text-red-900">
          <p>
            Showing <span className="font-medium">defaulters</span>
            {total > 0 ? ` · ${total} student${total === 1 ? "" : "s"} with remaining fees` : ""}
          </p>
          <Link href={studentsHref(filters, { defaulters: false })} className="btn text-xs">
            Show all
          </Link>
        </div>
      )}
      {printHref && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
          <p>
            Showing class <span className="font-medium">{filters.className}</span>
            {total > 0 ? ` · ${total} student${total === 1 ? "" : "s"}` : ""}
          </p>
          <a href={printHref} className="btn btn-primary">
            <Printer className="size-4" aria-hidden="true" />
            Print class list
          </a>
        </div>
      )}
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Roll no</th>
              <th>Name</th>
              <th>Father name</th>
              <th>Class</th>
              <th className="text-right">Monthly fee</th>
              <th>This month</th>
              <th className="text-right">Total paid</th>
              <th className="text-right">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No students match these filters.
                </td>
              </tr>
            )}
            {students.map((s) => {
              const [badge, badgeClass] = MONTH_BADGES[s.summary.currentMonthState];
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="font-mono text-xs">{s.studentId}</td>
                  <td>
                    <Link href={`/students/${s.id}`} className="font-medium text-emerald-700 hover:underline">
                      {s.name}
                    </Link>
                    {s.status === "left" && (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">Left</span>
                    )}
                  </td>
                  <td>{s.fatherName}</td>
                  <td>{s.className}</td>
                  <td className="text-right">{formatMoney(s.monthlyFee)}</td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{badge}</span>
                  </td>
                  <td className="text-right text-emerald-700">{formatMoney(s.summary.totalPaid)}</td>
                  <td className={`text-right ${s.summary.totalPending > 0 ? "text-red-700" : "text-slate-500"}`}>
                    {formatMoney(s.summary.totalPending)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        pathname="/students"
        query={paginationQuery}
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}
