"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useOrderStatusLabel } from "@/lib/order-status";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  payments: { provider: string; status: string }[];
};

export default function OrdersPage() {
  const t = useTranslations("Orders");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const statusLabel = useOrderStatusLabel();
  const { ready } = useRequireAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiFetch("/orders")
      .then(async (res) => setOrders(res.ok ? await res.json() : []))
      .catch(() => setOrders([]));
  }, [ready]);

  if (!ready || orders === null) return <main className="max-w-2xl mx-auto px-4 py-16 text-steel">{tc("loading")}</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">{t("title")}</h1>
      {orders.length === 0 ? (
        <p className="text-steel">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="flex items-center justify-between gap-3 border border-steel-light rounded-lg p-4 bg-white transition-all duration-200 hover:shadow-sm"
              >
                <div>
                  <p className="font-medium text-ink">{t("orderNumber", { number: o.orderNumber })}</p>
                  <p className="text-xs text-steel">{new Date(o.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">{formatMoney(o.total)}</p>
                  <p className="text-xs text-steel">{statusLabel(o)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
