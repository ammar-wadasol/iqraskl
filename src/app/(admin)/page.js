import { Suspense } from "react";
import Link from "next/link";
import Loading from "@/components/Loading";
import { getDashboardStats } from "@/lib/data";
import { MONTHS, formatMoney, formatMoneyCompact, monthLabel } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <Suspense fallback={<Loading label="Loading statistics…" />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

function StatCard({ label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900",
    green: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

async function Dashboard() {
  await requireAdmin();
  const stats = await getDashboardStats();
  const { today } = stats;
  const maxCollected = Math.max(...stats.collectedByMonth, 1);
  const typeRows = [
    ["Admission fees", stats.byType.admission],
    ["Monthly fees", stats.byType.monthly],
    ["Other fees", stats.byType.other],
    ["Products", stats.byType.products],
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active students" value={stats.activeCount} />
        <StatCard label="Total fees collected" value={formatMoney(stats.totalCollected)} tone="green" />
        <StatCard
          label={`Collected in ${monthLabel(today.year, today.month)}`}
          value={formatMoney(stats.collectedThisMonth)}
          tone="green"
        />
        <StatCard
          label="Pending fees"
          value={formatMoney(stats.totalPending)}
          hint="Admission, other and monthly fees due up to this month"
          tone="red"
        />
        <StatCard
          label="Monthly fee not paid"
          value={stats.unpaidThisMonthCount}
          hint={`Active students unpaid for ${monthLabel(today.year, today.month)} · ${stats.behindTwoOrMore} behind 2+ months`}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Fees by type</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Type</th>
                  <th className="text-right">Charged</th>
                  <th className="text-right">Collected</th>
                  <th className="text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {typeRows.map(([label, row]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="text-right">{formatMoney(row.due)}</td>
                    <td className="text-right text-emerald-700">{formatMoney(row.paid)}</td>
                    <td className="text-right text-red-700">{formatMoney(row.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">Collections in {today.year}</h2>
            <p className="text-xs text-slate-500">
              Year total {formatMoney(stats.collectedByMonth.reduce((a, b) => a + b, 0))}
            </p>
          </div>
          {stats.collectedByMonth.every((total) => total === 0) ? (
            <p className="py-10 text-center text-sm text-slate-500">No payments recorded in {today.year} yet.</p>
          ) : (
            <div className="flex h-52 items-end gap-1.5">
              {stats.collectedByMonth.map((total, i) => {
                const height = total > 0 ? Math.max((total / maxCollected) * 100, 8) : 0;
                const isCurrent = i + 1 === today.month;
                return (
                  <div
                    key={MONTHS[i]}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                    title={`${MONTHS[i]} ${today.year}: ${formatMoney(total)}`}
                  >
                    <span
                      className={`text-[10px] font-medium tabular-nums ${
                        total > 0 ? "text-slate-700" : "text-transparent"
                      }`}
                    >
                      {total > 0 ? formatMoneyCompact(total) : "0"}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t transition-colors ${
                          total === 0
                            ? "bg-slate-100"
                            : isCurrent
                              ? "bg-emerald-600"
                              : "bg-emerald-300 group-hover:bg-emerald-400"
                        }`}
                        style={{ height: total === 0 ? "2px" : `${height}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isCurrent ? "text-emerald-800" : "text-slate-500"
                      }`}
                    >
                      {MONTHS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">
            Not paid for {monthLabel(today.year, today.month)}
          </h2>
          <Link href="/fees" className="text-sm text-emerald-700 hover:underline">
            Open fees calendar
          </Link>
        </div>
        {stats.unpaidThisMonth.length === 0 ? (
          <p className="text-sm text-slate-500">Every active student has paid this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Father name</th>
                  <th>Class</th>
                  <th className="text-right">Months behind</th>
                  <th className="text-right">Monthly pending</th>
                </tr>
              </thead>
              <tbody>
                {stats.unpaidThisMonth.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.studentId}</td>
                    <td>
                      <Link href={`/students/${s.id}`} className="text-emerald-700 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.fatherName}</td>
                    <td>{s.className}</td>
                    <td className="text-right">{s.monthsBehind}</td>
                    <td className="text-right text-red-700">{formatMoney(s.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.unpaidThisMonthCount > stats.unpaidThisMonth.length && (
              <p className="mt-2 text-xs text-slate-500">
                Showing the {stats.unpaidThisMonth.length} furthest behind of {stats.unpaidThisMonthCount}.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
