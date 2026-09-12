"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";

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
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch("/admin/stats").then(async (res) => {
      if (res.ok) setStats(await res.json());
    });
  }, []);

  if (!stats) return <p className="text-steel">Loading…</p>;

  const cards = [
    { label: "Revenue (paid orders)", value: formatMoney(stats.revenue) },
    { label: "Orders", value: stats.orders },
    { label: "Awaiting payment", value: stats.pendingPayment, warn: stats.pendingPayment > 0 },
    { label: "Products", value: stats.products },
    { label: "Out of stock", value: stats.outOfStock, warn: stats.outOfStock > 0 },
    { label: "Categories", value: stats.categories },
    { label: "Brands", value: stats.brands },
    { label: "Users", value: stats.users },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="border border-steel-light rounded-lg p-4 bg-white transition-shadow duration-200 hover:shadow-sm">
            <p className="text-sm text-steel">{c.label}</p>
            <p className={`text-2xl font-bold ${c.warn ? "text-amber-dark" : "text-ink"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-display font-semibold text-ink mb-3">Recent orders</h2>
      {stats.recentOrders.length === 0 ? (
        <p className="text-steel text-sm">No orders yet.</p>
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
                  {o.user.firstName} {o.user.lastName} · {new Date(o.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ink">{formatMoney(o.total)}</p>
                <p className="text-xs text-steel">{o.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
