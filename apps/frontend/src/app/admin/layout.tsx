"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/account", label: "Account" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.push("/");
  }, [loading, user, router]);

  // The mobile nav is a horizontally-scrollable strip — after tapping a
  // link, some browsers reset the container's scroll position rather than
  // keeping the tapped item in view. Re-center the active item every time
  // the route changes so navigating never "jumps back to the beginning."
  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-zinc-500">Checking access…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
      <aside className="sm:w-48 shrink-0">
        <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0 bg-zinc-100 sm:bg-transparent rounded-lg sm:rounded-none p-1 sm:p-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              ref={pathname === link.href ? activeLinkRef : undefined}
              className={`block px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors duration-200 ${
                pathname === link.href
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-white sm:hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}