"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_LOCALE_COOKIE, ADMIN_LOCALES } from "@/lib/admin-locale";
import { apiFetch } from "@/lib/api";

type NavKey = "dashboard" | "orders" | "requests" | "products" | "import" | "categories" | "brands" | "vehicles" | "coupons" | "reviews" | "account";
const tabs: { href: string; key: NavKey }[] = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/orders", key: "orders" },
  { href: "/admin/requests", key: "requests" },
  { href: "/admin/products", key: "products" },
  { href: "/admin/import", key: "import" },
];
// Less frequent pages, folded into two menus.
const menus: { key: "catalog" | "more"; links: { href: string; key: NavKey }[] }[] = [
  { key: "catalog", links: [{ href: "/admin/categories", key: "categories" }, { href: "/admin/brands", key: "brands" }, { href: "/admin/vehicles", key: "vehicles" }] },
  { key: "more", links: [{ href: "/admin/coupons", key: "coupons" }, { href: "/admin/reviews", key: "reviews" }] },
];

// Badge counts on the tabs: orders still needing the owner and open part
// requests (from /admin/stats), refreshed on every admin page change.
function useNavCounts(pathname: string) {
  const [counts, setCounts] = useState<{ orders: number; requests: number }>({ orders: 0, requests: 0 });
  useEffect(() => {
    apiFetch("/admin/stats")
      .then(async (res) => {
        if (!res.ok) return;
        const s = await res.json();
        setCounts({ orders: s.orderGroups?.todo ?? 0, requests: s.openRequests ?? 0 });
      })
      .catch(() => {});
  }, [pathname]);
  return counts;
}

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
  const counts = useNavCounts(pathname);

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

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const badge = (key: NavKey) => (key === "orders" ? counts.orders : key === "requests" ? counts.requests : 0);
  const tab = (on: boolean) =>
    `flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3.5 py-3 font-semibold transition-colors ${
      on ? "border-amber text-ink" : "border-transparent text-steel hover:text-ink"
    }`;

  // Redesign step 6, option B: tabs across the top (a scrolling strip on
  // phones) instead of a sidebar, with counts on what needs attention.
  return (
    <>
      <nav aria-label={t("sections")} className="border-b border-line bg-card">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              ref={active(link.href) ? activeLinkRef : undefined}
              aria-current={active(link.href) ? "page" : undefined}
              className={tab(active(link.href))}
            >
              {t(`nav.${link.key}`)}
              {badge(link.key) > 0 && (
                <span className="rounded-full bg-amber px-1.5 text-[13px] font-bold leading-5 text-ink">{badge(link.key)}</span>
              )}
            </Link>
          ))}
          {menus.map((menu) => {
            const on = menu.links.some((l) => active(l.href));
            return (
              <details key={menu.key} className="group relative shrink-0">
                <summary className={`${tab(on)} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                  {t(`menu.${menu.key}`)} <span aria-hidden="true" className="text-xs">▾</span>
                </summary>
                <div className="fixed z-40 mt-1 flex min-w-48 flex-col rounded-[12px] border border-line bg-card p-1.5 shadow-lg">
                  {menu.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
                      aria-current={active(link.href) ? "page" : undefined}
                      className={`rounded-lg px-3 py-2.5 font-semibold ${active(link.href) ? "bg-ink text-paper" : "text-ink hover:bg-sand"}`}
                    >
                      {t(`nav.${link.key}`)}
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
          <Link href="/admin/account" aria-current={active("/admin/account") ? "page" : undefined} className={`${tab(active("/admin/account"))} ml-auto`}>
            {t("nav.account")}
          </Link>
          <div className="shrink-0 pl-2">
            <AdminLanguageSwitch />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto w-full px-4 py-8">
        {user.isDemo && <DemoBanner />}
        {children}
      </main>
    </>
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