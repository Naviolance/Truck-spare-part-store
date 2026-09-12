"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type Product = {
  id: string; name: string; price: string; status: string; quantity: number; createdAt: string;
  category: { name: string }; brand: { name: string } | null;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/products/admin/all");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePublish(product: Product) {
    setPendingId(product.id);
    const nextStatus = product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await apiFetch(`/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    await load();
    setPendingId(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setPendingId(id);
    await apiFetch(`/products/${id}`, { method: "DELETE" });
    await load();
    setPendingId(null);
  }

  if (loading) return <p className="text-steel">Loading…</p>;

  const outOfStock = products.filter((p) => p.quantity === 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-display font-bold">Products</h1>
        <div className="flex gap-2">
          <Link href="/admin/products/create" className="border border-ink text-ink text-sm px-4 py-2 rounded-lg">Create post (new)</Link>
          <Link href="/admin/products/new" className="bg-ink text-white text-sm px-4 py-2 rounded-lg">+ New product</Link>
        </div>
      </div>
      {outOfStock.length > 0 && (
        <div className="bg-amber/10 border-l-4 border-amber p-3 mb-4 text-sm text-ink">
          <span className="font-medium">{outOfStock.length} product{outOfStock.length !== 1 ? "s" : ""} out of stock</span>
          {" "}— hidden from the storefront until restocked: {outOfStock.map((p) => p.name).join(", ")}
        </div>
      )}
      <div className="sm:hidden space-y-3">
        {products.map((p) => (
          <div key={p.id} className={`border border-steel-light rounded-lg p-4 ${p.quantity === 0 ? "bg-red-50" : "bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{p.name}</p>
                <p className="text-xs text-steel">{p.category.name}</p>
              </div>
              <button onClick={() => togglePublish(p)} disabled={pendingId === p.id}
                className={`shrink-0 text-xs px-2 py-1 rounded-full disabled:opacity-50 ${p.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-steel-light text-steel"}`}>
                {pendingId === p.id ? "…" : p.status}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-ink">{formatMoney(p.price)}</span>
              <span className={p.quantity === 0 ? "text-red-600 font-medium" : "text-steel"}>
                {p.quantity === 0 ? "Out of stock" : `${p.quantity} in stock`}
              </span>
            </div>
            <p className="text-xs text-steel mt-1">Added {new Date(p.createdAt).toLocaleDateString()}</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/admin/products/${p.id}/edit`} className="flex-1 text-center border border-steel-light rounded-lg py-2 text-sm">
                Edit
              </Link>
              <button onClick={() => remove(p.id)} disabled={pendingId === p.id}
                className="flex-1 text-center border border-red-200 bg-red-50 text-red-600 rounded-lg py-2 text-sm disabled:opacity-50">
                {pendingId === p.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm bg-white border border-steel-light rounded-lg overflow-hidden">
        <thead className="bg-paper text-left">
          <tr><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Added</th><th className="p-3">Status</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`border-t border-steel-light ${p.quantity === 0 ? "bg-red-50" : ""}`}>
              <td className="p-3">{p.name}</td>
              <td className="p-3">{p.category.name}</td>
              <td className="p-3">{formatMoney(p.price)}</td>
              <td className={`p-3 ${p.quantity === 0 ? "text-red-600 font-medium" : ""}`}>{p.quantity}</td>
              <td className="p-3 text-steel" title={new Date(p.createdAt).toLocaleString()}>
                {new Date(p.createdAt).toLocaleDateString()}
              </td>
              <td className="p-3">
                <button onClick={() => togglePublish(p)} disabled={pendingId === p.id}
                  className={`text-xs px-2 py-1 rounded-full disabled:opacity-50 ${p.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-steel-light text-steel"}`}>
                  {pendingId === p.id ? "…" : p.status}
                </button>
              </td>
              <td className="p-3 text-right">
                <div className="inline-flex gap-2">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="border border-steel-light rounded-lg px-3 py-1.5 text-xs transition-colors duration-200 hover:border-ink"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => remove(p.id)}
                    disabled={pendingId === p.id}
                    className="border border-red-200 bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-xs transition-colors duration-200 hover:bg-red-100 disabled:opacity-50"
                  >
                    {pendingId === p.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}