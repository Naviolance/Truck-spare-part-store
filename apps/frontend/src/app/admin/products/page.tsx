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

  async function load() {
    const res = await apiFetch("/products/admin/all");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePublish(product: Product) {
    const nextStatus = product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await apiFetch(`/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await apiFetch(`/products/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const outOfStock = products.filter((p) => p.quantity === 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg">+ New product</Link>
      </div>
      {outOfStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-900">
          <span className="font-medium">{outOfStock.length} product{outOfStock.length !== 1 ? "s" : ""} out of stock</span>
          {" "}— hidden from the storefront until restocked: {outOfStock.map((p) => p.name).join(", ")}
        </div>
      )}
      <table className="w-full text-sm bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <thead className="bg-zinc-50 text-left">
          <tr><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Added</th><th className="p-3">Status</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`border-t border-zinc-100 ${p.quantity === 0 ? "bg-red-50" : ""}`}>
              <td className="p-3">{p.name}</td>
              <td className="p-3">{p.category.name}</td>
              <td className="p-3">{formatMoney(p.price)}</td>
              <td className={`p-3 ${p.quantity === 0 ? "text-red-600 font-medium" : ""}`}>{p.quantity}</td>
              <td className="p-3 text-zinc-500" title={new Date(p.createdAt).toLocaleString()}>
                {new Date(p.createdAt).toLocaleDateString()}
              </td>
              <td className="p-3">
                <button onClick={() => togglePublish(p)}
                  className={`text-xs px-2 py-1 rounded-full ${p.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {p.status}
                </button>
              </td>
              <td className="p-3 text-right space-x-3">
                <Link href={`/admin/products/${p.id}/edit`} className="underline">Edit</Link>
                <button onClick={() => remove(p.id)} className="text-red-600 underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}