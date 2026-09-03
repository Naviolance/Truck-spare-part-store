"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.push("/");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-zinc-500">Checking access…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
      <aside className="sm:w-48 shrink-0">
        <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors duration-200 ${
                pathname === link.href ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
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