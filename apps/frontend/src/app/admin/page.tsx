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
  pendingPayment: number;
  revenue: string;
  recentOrders: RecentOrder[];
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

  const cards = [
    { label: t("revenue"), value: formatMoney(stats.revenue) },
    { label: t("orders"), value: stats.orders.toLocaleString(locale) },
    { label: t("awaitingPayment"), value: stats.pendingPayment.toLocaleString(locale), warn: stats.pendingPayment > 0 },
    { label: t("products"), value: stats.products.toLocaleString(locale) },
    { label: t("outOfStock"), value: stats.outOfStock.toLocaleString(locale), warn: stats.outOfStock > 0 },
    { label: t("categories"), value: stats.categories.toLocaleString(locale) },
    { label: t("brands"), value: stats.brands.toLocaleString(locale) },
    { label: t("users"), value: stats.users.toLocaleString(locale) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">{t("title")}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="border border-steel-light rounded-lg p-4 bg-white transition-shadow duration-200 hover:shadow-sm">
            <p className="text-sm text-steel">{c.label}</p>
            <p className={`text-2xl font-bold ${c.warn ? "text-amber-dark" : "text-ink"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <DemandInsights />

      <h2 className="text-lg font-display font-semibold text-ink mb-3">{t("recentOrders")}</h2>
      {stats.recentOrders.length === 0 ? (
        <p className="text-steel text-sm">{t("noOrders")}</p>
      ) : (
        <div className="bg-white border border-steel-light rounded-lg divide-y divide-steel-light">
          {stats.recentOrders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders`}
              className="flex items-center justify-between p-3 text-sm transition-colors duration-200 hover:bg-paper"
            >
              <div>
                <p className="font-medium text-ink">#{o.orderNumber}</p>
                <p className="text-xs text-steel">
                  {o.user.firstName} {o.user.lastName} · {new Date(o.createdAt).toLocaleDateString(locale)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ink">{formatMoney(o.total)}</p>
                <p className="text-xs text-steel">{statusLabel({ status: o.status, payments: [] })}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
