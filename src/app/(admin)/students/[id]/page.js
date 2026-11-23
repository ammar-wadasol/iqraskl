import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Banknote,
  CircleDollarSign,
  IdCard,
  Phone,
  Printer,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import Loading from "@/components/Loading";
import { MonthCell, MonthLegend } from "@/components/MonthCell";
import StudentActions from "@/components/StudentActions";
import { deleteOtherFee } from "@/app/actions/fees";
import { getStudentDetail } from "@/lib/data";
import { MONTHS, formatDate, formatMoney, monthLabel } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Student · Iqra School Office" };

export default function StudentPage({ params, searchParams }) {
  return (
    <>
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Students
      </Link>
      <Suspense fallback={<Loading label="Loading student…" />}>
        <StudentDetail params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function paymentLabel(p) {
  if (p.type === "monthly") return `Monthly fee · ${monthLabel(p.year, p.month)}`;
  return p.description || (p.type === "admission" ? "Admission fee" : "Other fee");
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function InfoItem({ label, icon: Icon, children }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

async function StudentDetail({ params, searchParams }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const detail = await getStudentDetail(id);
  if (!detail) notFound();

  const { student, summary, siblings, charges, payments, today } = detail;
  const payMatch = /^(\d{4})-(\d{2})$/.exec(typeof sp.pay === "string" ? sp.pay : "");
  const payMonth = payMatch && Number(payMatch[2]) >= 1 && Number(payMatch[2]) <= 12 ? sp.pay : null;
  const requestedYear = Number.parseInt(sp.year, 10);
  const year = payMonth
    ? Number(payMatch[1])
    : requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : today.year;
  const currentMonth = `${today.year}-${String(today.month).padStart(2, "0")}`;
  const months = detail.monthsFor(year);
  const isLeft = student.status === "left";

  return (
    <>
      <div className="card overflow-hidden p-0">
        <div className="relative flex flex-col gap-4 overflow-hidden border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white p-5 md:flex-row md:items-center md:justify-between">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[clamp(3.5rem,12vw,7rem)] font-black leading-none tracking-tight text-emerald-800/[0.07] uppercase"
          >
            {student.className}
          </span>
          <div className="relative z-10 flex min-w-0 items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg font-semibold text-white"
            >
              {initials(student.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="truncate text-xl font-semibold">{student.name}</h1>
                <span className="font-mono text-sm text-slate-500">{student.studentId}</span>
                {isLeft && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    Inactive · {formatDate(student.leftDate)}
                  </span>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  {student.fatherName}
                </span>
                {student.cnic && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    <IdCard className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    {student.cnic}
                  </span>
                )}
                {student.phone && (
                  <a
                    href={`tel:${student.phone}`}
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline"
                  >
                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                    {student.phone}
                  </a>
                )}
              </p>
            </div>
          </div>
          <div className="relative z-10">
            <StudentActions
              student={student}
              charges={charges}
              today={today}
              year={year}
              payMonth={payMonth}
              currentMonth={currentMonth}
              siblingCount={siblings.length}
            />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-4">
          <InfoItem label="Total remaining" icon={Banknote}>
            <span className={summary.totalPending > 0 ? "text-red-700" : undefined}>
              {formatMoney(summary.totalPending)}
            </span>
          </InfoItem>
          <InfoItem label="Total paid" icon={CircleDollarSign}>
            <span className="text-emerald-700">{formatMoney(summary.totalPaid)}</span>
          </InfoItem>
          <InfoItem label="Monthly fee" icon={Wallet}>
            {formatMoney(student.monthlyFee)}
          </InfoItem>
          <InfoItem label="Admission date" icon={CalendarDays}>
            {formatDate(student.admissionDate)}
          </InfoItem>
        </dl>
      </div>

      {siblings.length > 0 && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-emerald-700" aria-hidden="true" />
              <h2 className="font-semibold">Siblings (same CNIC)</h2>
            </div>
            <a
              href={`/students/${student.id}/fees/siblings/pdf`}
              className="btn"
              title="Print fee challans for this student and all siblings"
            >
              <Printer className="size-4" aria-hidden="true" />
              Print all siblings
            </a>
          </div>
          <p className="text-sm text-slate-500">
            Open a sibling to record their fees, or print challans for the whole family at once.
          </p>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th className="text-right">Monthly fee</th>
                  <th className="text-right">Remaining</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {siblings.map((sib) => (
                  <tr key={sib.id}>
                    <td>
                      <Link href={`/students/${sib.id}`} className="font-medium text-emerald-700 hover:underline">
                        {sib.name}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-slate-500">{sib.studentId}</span>
                      {sib.status === "left" && (
                        <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                          Left
                        </span>
                      )}
                    </td>
                    <td>{sib.className}</td>
                    <td className="text-right">{formatMoney(sib.monthlyFee)}</td>
                    <td
                      className={`text-right ${sib.summary.totalPending > 0 ? "text-red-700" : "text-slate-500"}`}
                    >
                      {formatMoney(sib.summary.totalPending)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/students/${sib.id}?pay=${currentMonth}`}
                        className="btn"
                      >
                        <Wallet className="size-3.5" aria-hidden="true" />
                        Fees
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Monthly fees {year}</h2>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/students/${student.id}?year=${year - 1}`} scroll={false} className="btn">
              <ChevronLeft className="size-4" aria-hidden="true" />
              {year - 1}
            </Link>
            <Link href={`/students/${student.id}?year=${year + 1}`} scroll={false} className="btn">
              {year + 1}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {months.map((m, i) => (
            <div key={MONTHS[i]} className="space-y-1 text-center">
              <p className="text-xs text-slate-500">{MONTHS[i]}</p>
              <MonthCell
                status={m}
                href={`/students/${student.id}?pay=${year}-${String(i + 1).padStart(2, "0")}`}
                scroll={false}
                title={`${monthLabel(year, i + 1)}: paid ${formatMoney(m.paid)} of ${formatMoney(m.due)}`}
              />
            </div>
          ))}
        </div>
        <MonthLegend />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Admission and other fees</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Fee</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Remaining</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.description || (c.type === "admission" ? "Admission fee" : "Other fee")}</td>
                    <td className="text-right">{formatMoney(c.amountDue)}</td>
                    <td className="text-right text-emerald-700">{formatMoney(c.amountPaid)}</td>
                    <td className="text-right text-red-700">{formatMoney(c.amountDue - c.amountPaid)}</td>
                    <td className="text-right">
                      {c.type === "other" && c.amountPaid === 0 && (
                        <form action={deleteOtherFee}>
                          <input type="hidden" name="recordId" value={c.id} />
                          <ConfirmButton message={`Remove "${c.description}"?`}>Remove</ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card lg:col-span-3">
          <h2 className="mb-3 font-semibold">Payment history</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>For</th>
                    <th>Note</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{formatDate(p.paidOn)}</td>
                      <td>{paymentLabel(p)}</td>
                      <td className="text-slate-500">{p.note}</td>
                      <td className="text-right font-medium">{formatMoney(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
