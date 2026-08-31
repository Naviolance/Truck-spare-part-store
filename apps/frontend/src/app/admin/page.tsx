"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Stats = { products: number; categories: number; brands: number; users: number; orders: number };

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch("/admin/stats").then(async (res) => {
      if (res.ok) setStats(await res.json());
    });
  }, []);

  const cards = stats
    ? [
        { label: "Products", value: stats.products },
        { label: "Categories", value: stats.categories },
        { label: "Brands", value: stats.brands },
        { label: "Users", value: stats.users },
        { label: "Orders", value: stats.orders },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-gray-200 rounded-lg p-4 bg-white">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}