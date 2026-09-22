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
    return <main className="max-w-6xl mx-auto px-4 py-16 text-steel">Checking access…</main>;
  }

  // The post-style product composer is a focused, full-screen flow - the
  // persistent sidebar nav would be noise there, same as a real app's post
  // composer doesn't show its own tab bar. Still gated by the auth check
  // above, just without the surrounding chrome.
  const isFocusMode = pathname.startsWith("/admin/products/create");
  if (isFocusMode) {
    return (
      <main className="max-w-lg mx-auto min-h-screen">
        {user.isDemo && <DemoBanner />}
        {children}
      </main>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
      <aside className="sm:w-48 shrink-0">
        <nav aria-label="Admin sections" className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0 bg-steel-light sm:bg-transparent rounded-lg sm:rounded-none p-1 sm:p-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              ref={pathname === link.href ? activeLinkRef : undefined}
              className={`block px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors duration-200 ${
                pathname === link.href
                  ? "bg-ink text-white"
                  : "text-steel hover:bg-white sm:hover:bg-steel-light hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        {user.isDemo && <DemoBanner />}
        {children}
      </main>
    </div>
  );
}

// Shown to the read-only demo account. The backend is what actually blocks
// changes (DemoReadOnlyInterceptor); this just tells visitors up front, so
// a rejected "Save" doesn't look like a bug.
function DemoBanner() {
  return (
    <div role="status" className="mb-6 rounded-lg border border-amber bg-amber/10 px-4 py-3 text-sm text-ink">
      <p className="font-medium">You&apos;re viewing the admin panel in demo mode.</p>
      <p className="mt-1 text-steel">
        Look around as much as you like. Saving, deleting and other changes are turned off for this account.
      </p>
    </div>
  );
}