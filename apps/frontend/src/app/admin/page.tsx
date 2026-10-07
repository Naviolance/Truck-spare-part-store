"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useOrderStatusLabel } from "@/lib/order-status";
import { DemandInsights } from "@/components/admin/DemandInsights";

type RecentOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
};

type Stats = {
  products: number;
  categories: number;
  brands: number;
  users: number;
  orders: number;
  outOfStock: number;
  noPhoto: number;
  pendingPayment: number;
  revenue: string;
  recentOrders: RecentOrder[];
  orderGroups: { todo: number; doing: number; done: number; closed: number };
  openRequests: number;
};

export default function AdminDashboardPage() {
  const t = useTranslations("AdminDashboard");
  const locale = useLocale();
  const statusLabel = useOrderStatusLabel();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch("/admin/stats").then(async (res) => {
      if (res.ok) setStats(await res.json());
    });
  }, []);

  if (!stats) return <p className="text-steel">{t("loading")}</p>;

  const n = (v: number) => v.toLocaleString(locale);
  const numbers = [
    { label: t("revenue"), value: formatMoney(stats.revenue) },
    { label: t("orders"), value: n(stats.orders) },
    { label: t("products"), value: n(stats.products) },
    { label: t("users"), value: n(stats.users) },
    { label: t("categories"), value: n(stats.categories) },
    { label: t("brands"), value: n(stats.brands) },
  ];
  // "To do today" (redesign step 6, option B): what needs the owner, first.
  const tasks = [
    { count: stats.orderGroups.todo, title: t("taskOrders"), body: t("taskOrdersBody"), href: "/admin/orders?group=todo", cta: t("taskOrdersCta") },
    { count: stats.openRequests, title: t("taskRequests"), body: t("taskRequestsBody"), href: "/admin/requests?status=OPEN", cta: t("taskRequestsCta") },
    { count: stats.outOfStock, title: t("outOfStock"), body: t("taskStockBody"), href: "/admin/products?stock=out", cta: t("taskStockCta") },
    { count: stats.noPhoto, title: t("taskPhotos"), body: t("taskPhotosBody"), href: "/admin/products?photos=none", cta: t("taskPhotosCta") },
  ];
  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl sm:text-[38px] font-bold text-ink">{t("todayTitle")}</h1>
        <p className="mt-1 text-steel first-letter:uppercase">{t("todayIntro", { date: today })}</p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {tasks.map((task, i) => {
          const urgent = i === 0 && task.count > 0;
          return (
            <section
              key={task.href}
              className={`flex flex-col gap-2.5 rounded-[14px] p-5 ${urgent ? "bg-ink text-paper" : "border border-line bg-card text-ink"}`}
            >
              <p className={`font-display text-[44px] font-bold leading-none ${urgent ? "text-amber" : ""}`}>{n(task.count)}</p>
              <h2 className="text-lg font-bold">{task.title}</h2>
              <p className={`text-sm ${urgent ? "text-paper-dim" : "text-steel"}`}>{task.body}</p>
              <Link
                href={task.href}
                className={`mt-auto flex h-11 items-center justify-center rounded-[10px] font-bold ${
                  urgent ? "bg-amber text-ink hover:bg-amber-dark" : "border-2 border-ink text-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {task.cta}
              </Link>
            </section>
          );
        })}
      </div>

      <section aria-label={t("numbers")} className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
        {numbers.map((c) => (
          <div key={c.label} className="border-t-[3px] border-ink pt-2.5">
            <p className="text-sm text-steel">{c.label}</p>
            <p className="text-xl font-bold text-ink">{c.value}</p>
          </div>
        ))}
      </section>

      <DemandInsights />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-ink">{t("recentOrders")}</h2>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-steel">{t("noOrders")}</p>
        ) : (
          <ul className="divide-y divide-sand rounded-[14px] border border-line bg-card px-4">
            {stats.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href="/admin/orders" className="flex items-center justify-between gap-3 py-3 hover:text-amber-dark">
                  <span>
                    <span className="font-mono text-sm font-semibold text-ink">{o.orderNumber}</span>
                    <span className="block text-sm text-steel">
                      {o.user.firstName} {o.user.lastName} · {new Date(o.createdAt).toLocaleDateString(locale)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-bold text-ink">{formatMoney(o.total)}</span>
                    <span className="block text-sm text-steel">{statusLabel({ status: o.status, payments: [] })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
