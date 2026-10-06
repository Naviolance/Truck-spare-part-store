"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_LOCALE_COOKIE, ADMIN_LOCALES } from "@/lib/admin-locale";

const links = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/products", key: "products" },
  { href: "/admin/import", key: "import" },
  { href: "/admin/categories", key: "categories" },
  { href: "/admin/brands", key: "brands" },
  { href: "/admin/vehicles", key: "vehicles" },
  { href: "/admin/orders", key: "orders" },
  { href: "/admin/requests", key: "requests" },
  { href: "/admin/coupons", key: "coupons" },
  { href: "/admin/reviews", key: "reviews" },
  { href: "/admin/account", key: "account" },
] as const;

// EN/FR switch: saves the choice for a year and re-renders the admin in it.
function AdminLanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("AdminShell");
  function choose(next: string) {
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/admin; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <div className="inline-flex rounded-full border border-steel-light overflow-hidden text-xs" role="group" aria-label={t("language")}>
      {ADMIN_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={locale === l}
          className={`px-2.5 py-1 uppercase ${locale === l ? "bg-ink text-white" : "text-steel hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const t = useTranslations("AdminShell");

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
    return <main className="max-w-6xl mx-auto px-4 py-16 text-steel">{t("checkingAccess")}</main>;
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
        <nav aria-label={t("sections")} className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0 bg-steel-light sm:bg-transparent rounded-lg sm:rounded-none p-1 sm:p-0">
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
              {t(`nav.${link.key}`)}
            </Link>
          ))}
        </nav>
        <div className="mt-3 sm:mt-6 sm:px-3">
          <AdminLanguageSwitch />
        </div>
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
  const t = useTranslations("AdminShell");
  return (
    <div role="status" className="mb-6 rounded-lg border border-amber bg-amber/10 px-4 py-3 text-sm text-ink">
      <p className="font-medium">{t("demoTitle")}</p>
      <p className="mt-1 text-steel">{t("demoBody")}</p>
    </div>
  );
}