"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Package, Users } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/students", label: "Students", Icon: Users },
  { href: "/fees", label: "Fees calendar", Icon: CalendarDays },
  { href: "/products", label: "Products", Icon: Package },
];

function isActive(href, pathname) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function LinkList({ pathname }) {
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
            isActive(href, pathname)
              ? "bg-emerald-50 text-emerald-800"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function ActiveLinkList() {
  return <LinkList pathname={usePathname()} />;
}

// The pathname is request data, so the highlighted version streams in
// behind a fallback with identical layout.
export default function NavLinks() {
  return (
    <Suspense fallback={<LinkList pathname={null} />}>
      <ActiveLinkList />
    </Suspense>
  );
}
