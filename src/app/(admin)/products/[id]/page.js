import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Loading from "@/components/Loading";
import { ProductDetailActions } from "@/components/ProductActions";
import { getToday } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { getProductDetail } from "@/lib/products";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Product · Iqra School Office" };

export default function ProductPage({ params }) {
  return (
    <>
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Products
      </Link>
      <Suspense fallback={<Loading label="Loading item…" />}>
        <ProductDetail params={params} />
      </Suspense>
    </>
  );
}

function InfoItem({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

async function ProductDetail({ params }) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();

  const { product, sales, students } = detail;
  const today = getToday();
  const soldQty = sales.reduce((acc, s) => acc + s.quantity, 0);
  const collected = sales.reduce((acc, s) => acc + s.amountPaid, 0);
  const outstanding = sales.reduce((acc, s) => acc + s.remaining, 0);

  return (
    <>
      <div className="card overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white"
            >
              <Package className="size-7" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{product.name}</h1>
              {product.description ? (
                <p className="mt-0.5 text-sm text-slate-600">{product.description}</p>
              ) : (
                <p className="mt-0.5 text-sm text-slate-500">School item for sale</p>
              )}
            </div>
          </div>
          <ProductDetailActions product={product} students={students} today={today.iso} />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-4">
          <InfoItem label="Unit price">{formatMoney(product.unitPrice)}</InfoItem>
          <InfoItem label="In stock">
            <span className={product.stock === 0 ? "text-red-700" : undefined}>{product.stock}</span>
          </InfoItem>
          <InfoItem label="Sold">{soldQty}</InfoItem>
          <InfoItem label="Collected">
            <span className="text-emerald-700">{formatMoney(collected)}</span>
            {outstanding > 0 && (
              <span className="ml-2 text-xs font-normal text-red-700">
                ({formatMoney(outstanding)} unpaid)
              </span>
            )}
          </InfoItem>
        </dl>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Who bought this</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-slate-500">No sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Discount</th>
                  <th className="text-right">Remaining</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{formatDate(s.soldOn)}</td>
                    <td>
                      {s.student ? (
                        <>
                          <Link
                            href={`/students/${s.student.id}`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            {s.student.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            <span className="font-mono">{s.student.studentId}</span>
                            {" · "}
                            {s.student.fatherName}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">Unknown student</span>
                      )}
                    </td>
                    <td>{s.student?.className ?? "—"}</td>
                    <td className="text-right">{s.quantity}</td>
                    <td className="text-right">{formatMoney(s.totalAmount)}</td>
                    <td className="text-right text-emerald-700">{formatMoney(s.amountPaid)}</td>
                    <td className="text-right">{s.discount > 0 ? formatMoney(s.discount) : "—"}</td>
                    <td className={`text-right ${s.remaining > 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {s.remaining > 0 ? formatMoney(s.remaining) : "Cleared"}
                    </td>
                    <td className="text-slate-500">{s.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
