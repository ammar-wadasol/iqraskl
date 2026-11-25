import { LogOut } from "lucide-react";
import NavLinks from "@/components/NavLinks";
import { logout } from "@/app/actions/auth";
import { getSession } from "@/lib/session";

export default async function AdminLayout({ children }) {
  const session = await getSession();
  const roleLabel = session?.role === "user" ? "User" : "Admin";

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <span className="whitespace-nowrap font-semibold text-emerald-800">Iqra School Office</span>
            <NavLinks />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {roleLabel}
            </span>
            <form action={logout}>
              <button type="submit" className="btn">
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6">{children}</main>
    </>
  );
}
