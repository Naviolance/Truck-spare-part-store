"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string; slug: string; name: string; price: string; condition: string;
  images: { url: string }[]; category: { name: string }; brand: { name: string } | null;
};
type Option = { id: string; name: string };

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

const selectClass = "w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-zinc-500 bg-white";

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || "");
  const [brandId, setBrandId] = useState(searchParams.get("brandId") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 24;

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
    if (minPrice && Number(minPrice) >= 0) params.set("minPrice", minPrice);
    if (maxPrice && Number(maxPrice) >= 0) params.set("maxPrice", maxPrice);
    if (page > 1) params.set("page", String(page));

    router.replace(`/products?${params.toString()}`, { scroll: false });

    const requestParams = new URLSearchParams(params);
    requestParams.set("page", String(page));
    requestParams.set("limit", String(PAGE_SIZE));

    setLoading(true);
    fetch(`${API_URL}/products?${requestParams.toString()}`)
      .then((r) => (r.ok ? r.json() : { items: [], total: 0, totalPages: 1 }))
      .then((data) => {
        setProducts(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, brandId, condition, minPrice, maxPrice, page]);

  function updateFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setBrandId("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  const hasFilters = categoryId || brandId || condition || minPrice || maxPrice || search;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">All parts</h1>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="sm:hidden flex items-center gap-1.5 text-sm text-zinc-600 border border-zinc-300 rounded-lg px-3 py-1.5 transition-colors duration-200 hover:text-zinc-900 hover:border-zinc-400"
        >
          <FilterIcon /> Filters{hasFilters ? " •" : ""}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className={`sm:w-56 shrink-0 space-y-4 ${filtersOpen ? "block" : "hidden"} sm:block`}>
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-600">Search</label>
            <input
              value={search}
              onChange={(e) => updateFilter(setSearch, e.target.value)}
              placeholder="Part name, number…"
              className={selectClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-600">Category</label>
            <select value={categoryId} onChange={(e) => updateFilter(setCategoryId, e.target.value)} className={selectClass}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-600">Brand</label>
            <select value={brandId} onChange={(e) => updateFilter(setBrandId, e.target.value)} className={selectClass}>
              <option value="">All brands</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-600">Condition</label>
            <select value={condition} onChange={(e) => updateFilter(setCondition, e.target.value)} className={selectClass}>
              <option value="">Any condition</option>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
              <option value="RECONDITIONED">Reconditioned</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-600">Price range</label>
            <div className="flex gap-2">
              <input type="number" min="0" placeholder="Min" value={minPrice} onChange={(e) => updateFilter(setMinPrice, e.target.value)} className={selectClass} />
              <input type="number" min="0" placeholder="Max" value={maxPrice} onChange={(e) => updateFilter(setMaxPrice, e.target.value)} className={selectClass} />
            </div>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-zinc-500 underline transition-colors duration-200 hover:text-zinc-700">
              Clear all filters
            </button>
          )}
        </aside>

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
              <p className="font-medium">No parts match your filters.</p>
              <button onClick={clearFilters} className="text-sm underline mt-2">Clear filters</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-500 mb-4">{total} result{total !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-300"
                  >
                    {product.images[0] && (
                      <div className="relative w-full h-40 overflow-hidden">
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized={isUnoptimizableImage(product.images[0].url)}
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">
                        {product.brand?.name ?? "Unbranded"} · {product.category.name}
                      </p>
                      <h2 className="font-semibold mt-1 text-zinc-900">{product.name}</h2>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-zinc-900">{formatMoney(product.price)}</span>
                        <span className="text-xs rounded-full bg-zinc-100 text-zinc-600 px-2 py-0.5">{product.condition}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-sm px-3 py-1.5 border border-zinc-300 rounded-lg transition-colors duration-200 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-sm px-3 py-1.5 border border-zinc-300 rounded-lg transition-colors duration-200 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<main className="max-w-6xl mx-auto px-4 py-10 text-zinc-500">Loading…</main>}>
      <ProductsPageInner />
    </Suspense>
  );
}
