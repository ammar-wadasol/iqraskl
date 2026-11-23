import { LogOut } from "lucide-react";
import NavLinks from "@/components/NavLinks";
import { logout } from "@/app/actions/auth";

export default function AdminLayout({ children }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <span className="whitespace-nowrap font-semibold text-emerald-800">Iqra School Office</span>
            <NavLinks />
          </div>
          <form action={logout}>
            <button type="submit" className="btn">
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6">{children}</main>
    </>
  );
}
