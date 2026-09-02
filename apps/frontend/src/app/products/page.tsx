"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string; slug: string; name: string; price: string; condition: string;
  images: { url: string }[]; category: { name: string }; brand: { name: string } | null;
};
type Option = { id: string; name: string };

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || "");
  const [brandId, setBrandId] = useState(searchParams.get("brandId") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");

  useEffect(() => {
    fetch(`${API_URL}/categories`).then((r) => r.json()).then(setCategories);
    fetch(`${API_URL}/brands`).then((r) => r.json()).then(setBrands);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (brandId) params.set("brandId", brandId);
    if (condition) params.set("condition", condition);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);

    router.replace(`/products?${params.toString()}`, { scroll: false });

    setLoading(true);
    fetch(`${API_URL}/products?${params.toString()}`)
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, brandId, condition, minPrice, maxPrice]);

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setBrandId("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
  }

  const hasFilters = categoryId || brandId || condition || minPrice || maxPrice || search;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">All parts</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className="sm:w-56 shrink-0 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Part name, number…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Brand</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">All brands</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Any condition</option>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
              <option value="RECONDITIONED">Reconditioned</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Price range</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
              <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
            </div>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-gray-500 underline">
              Clear all filters
            </button>
          )}
        </aside>

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
              <p className="font-medium">No parts match your filters.</p>
              <button onClick={clearFilters} className="text-sm underline mt-2">Clear filters</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{products.length} result{products.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {product.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0].url} alt={product.name} className="w-full h-40 object-cover" />
                    )}
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        {product.brand?.name ?? "Unbranded"} · {product.category.name}
                      </p>
                      <h2 className="font-semibold mt-1">{product.name}</h2>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold">${product.price}</span>
                        <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">{product.condition}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<main className="max-w-6xl mx-auto px-4 py-10 text-gray-500">Loading…</main>}>
      <ProductsPageInner />
    </Suspense>
  );
}