"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { AccountDetails } from "@/components/AccountDetails";
import { MarketingConsent } from "@/components/MarketingConsent";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { apiFetch } from "@/lib/api";
import { trackerStep } from "@/lib/order-status";
import { useRequireAuth } from "@/lib/use-require-auth";
import { OrdersSection, type AccountOrder } from "./OrdersSection";

const SECTIONS = ["orders", "details", "password"] as const;
type Section = (typeof SECTIONS)[number];

// "Mon compte" (redesign step 5, option B): orders, contact details and
// password in one place, with a side menu (a scrolling tab row on phones).
// The section is in the URL (?section=details) so Back and links work;
// /orders redirects here.
export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountHub />
    </Suspense>
  );
}

function AccountHub() {
  const t = useTranslations("Account");
  const tc = useTranslations("Common");
  const { ready, user } = useRequireAuth();
  const { logout } = useAuth();
  const requested = useSearchParams().get("section");
  const section: Section = SECTIONS.find((s) => s === requested) ?? "orders";
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiFetch("/orders")
      .then(async (res) => setOrders(res.ok ? await res.json() : []))
      .catch(() => setOrders([]));
  }, [ready]);

  if (!ready) return <main className="max-w-3xl mx-auto px-4 py-16 text-steel">{tc("loading")}</main>;

  const activeCount = (orders ?? []).filter((o) => (trackerStep(o.status) ?? 4) < 4).length;
  const labels: Record<Section, string> = { orders: t("navOrders"), details: t("navDetails"), password: t("navPassword") };
  const item = (on: boolean) =>
    `flex min-h-[46px] shrink-0 items-center justify-between gap-2 rounded-[10px] px-3.5 font-semibold transition-colors ${
      on ? "bg-ink text-paper" : "text-ink hover:bg-sand"
    }`;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl sm:text-[40px] font-bold text-ink">{t("hubTitle")}</h1>
        <p className="mt-1 text-steel">{t("hello", { name: user?.firstName ?? "" })}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-7">
        <nav
          aria-label={t("hubTitle")}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:w-64 lg:shrink-0 lg:flex-col lg:rounded-[14px] lg:border lg:border-line lg:bg-card lg:p-2"
        >
          {SECTIONS.map((s) => (
            <Link
              key={s}
              href={s === "orders" ? "/account" : `/account?section=${s}`}
              aria-current={s === section ? "page" : undefined}
              className={item(s === section)}
            >
              {labels[s]}
              {s === "orders" && activeCount > 0 && (
                <span className={`rounded-full px-2 text-[13px] ${s === section ? "bg-amber text-ink" : "bg-[#F6E6C8] text-amber-dark"}`}>
                  {t("activeCount", { count: activeCount })}
                </span>
              )}
            </Link>
          ))}
          <button
            type="button"
            onClick={logout}
            className="flex min-h-[46px] shrink-0 items-center rounded-[10px] px-3.5 text-left font-semibold text-[#8A3821] hover:bg-sand"
          >
            {t("logout")}
          </button>
        </nav>

        <div className="min-w-0 flex-1">
          {section === "orders" &&
            (orders === null ? (
              <div className="flex flex-col gap-4" aria-hidden="true">
                <div className="skeleton h-44 rounded-[14px]" />
                <div className="skeleton h-28 rounded-[14px]" />
              </div>
            ) : (
              <OrdersSection orders={orders} />
            ))}
          {section === "details" && (
            <section className="max-w-xl rounded-[14px] border border-line bg-card p-5 sm:p-6">
              <h2 className="mb-1 font-display text-2xl font-bold text-ink">{t("navDetails")}</h2>
              <p className="mb-5 text-sm text-steel">{t("intro")}</p>
              <AccountDetails variant="customer" />
              <MarketingConsent />
            </section>
          )}
          {section === "password" && (
            <section className="max-w-xl rounded-[14px] border border-line bg-card p-5 sm:p-6">
              <ChangePasswordForm />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
