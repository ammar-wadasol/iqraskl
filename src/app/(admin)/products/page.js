import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { Package, Search, X } from "lucide-react";
import Loading from "@/components/Loading";
import Pagination from "@/components/Pagination";
import { AddProductButton, RecordSaleButton } from "@/components/ProductActions";
import { getToday } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import {
  PRODUCT_PAGE_SIZE,
  listActiveStudentsForSale,
  listProducts,
  parseProductFilters,
} from "@/lib/products";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Products · Iqra School Office" };

export default function ProductsPage({ searchParams }) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Products</h1>
        <AddProductButton />
      </div>
      <Suspense fallback={<Loading label="Loading products…" />}>
        <ProductsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProductsList({ searchParams }) {
  await requireAdmin();
  const filters = parseProductFilters(await searchParams);
  const [{ products, total, page, pageCount }, students] = await Promise.all([
    listProducts(filters),
    listActiveStudentsForSale(),
  ]);
  const today = getToday().iso;
  const resetKey = JSON.stringify(filters);

  return (
    <>
      <Form key={resetKey} action="/products" className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="p-name" className="label">Item name</label>
          <input
            id="p-name"
            name="name"
            defaultValue={filters.name}
            className="input"
            placeholder="Search items"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            <Search className="size-4" aria-hidden="true" />
            Search
          </button>
          <Link href="/products" className="btn" aria-label="Clear filters" title="Clear filters">
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Form>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Item</th>
              <th className="text-right">Unit price</th>
              <th className="text-right">In stock</th>
              <th className="text-right">Sold</th>
              <th className="text-right">Buyers</th>
              <th className="text-right">Collected</th>
              <th className="text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  <Package className="mx-auto mb-2 size-8 text-slate-300" aria-hidden="true" />
                  No items yet. Add an item to start tracking sales.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td>
                  <Link href={`/products/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                    {p.name}
                  </Link>
                  {p.description && (
                    <p className="text-xs text-slate-500">{p.description}</p>
                  )}
                </td>
                <td className="text-right">{formatMoney(p.unitPrice)}</td>
                <td className={`text-right font-medium ${p.stock === 0 ? "text-red-700" : "text-slate-900"}`}>
                  {p.stock}
                </td>
                <td className="text-right">{p.quantitySold}</td>
                <td className="text-right">{p.buyerCount}</td>
                <td className="text-right text-emerald-700">{formatMoney(p.revenue)}</td>
                <td className="text-right">
                  <RecordSaleButton
                    product={{
                      id: p.id,
                      name: p.name,
                      unitPrice: p.unitPrice,
                      stock: p.stock,
                    }}
                    students={students}
                    today={today}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        pathname="/products"
        query={filters}
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PRODUCT_PAGE_SIZE}
      />
    </>
  );
}
