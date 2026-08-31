"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ImageUploader } from "@/components/ImageUploader";

type Option = { id: string; name: string };

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", quantity: "", condition: "NEW",
    categoryId: "", brandId: "", partNumber: "",
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    apiFetch("/categories").then((res) => res.json()).then(setCategories);
    apiFetch("/brands").then((res) => res.json()).then(setBrands);
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await apiFetch("/products", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity),
        brandId: form.brandId || undefined,
        imageUrls,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to create product");
      return;
    }
    router.push("/admin/products");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea required value={form.description} onChange={(e) => update("description", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <input required type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input required type="number" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Condition</label>
          <select value={form.condition} onChange={(e) => update("condition", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="RECONDITIONED">Reconditioned</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select required value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Brand (optional)</label>
          <select value={form.brandId} onChange={(e) => update("brandId", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
            <option value="">No brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Part number (optional)</label>
          <input value={form.partNumber} onChange={(e) => update("partNumber", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <ImageUploader imageUrls={imageUrls} onChange={setImageUrls} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="bg-gray-900 text-white rounded px-4 py-2">Create product</button>
      </form>
      <p className="text-xs text-gray-500 mt-3">New products start as drafts — publish them from the products list.</p>
    </div>
  );
}