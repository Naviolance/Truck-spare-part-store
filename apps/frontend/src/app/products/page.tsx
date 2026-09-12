"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { RequestProductForm } from "@/components/RequestProductForm";
import { publicFetch } from "@/lib/api";

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

const selectClass = "w-full border border-steel-light px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-ink bg-white";

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
  const [fuzzy, setFuzzy] = useState(false);
  const PAGE_SIZE = 24;

  useEffect(() => {
    publicFetch(`/categories`).then((r) => r.json()).then(setCategories);
    publicFetch(`/brands`).then((r) => r.json()).then(setBrands);
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
    publicFetch(`/products?${requestParams.toString()}`)
      .then((r) => (r.ok ? r.json() : { items: [], total: 0, totalPages: 1 }))
      .then((data) => {
        setProducts(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setFuzzy(Boolean(data.fuzzy));
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
      <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-ink">
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight">All parts</h1>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="sm:hidden flex items-center gap-1.5 text-sm text-steel border border-steel-light px-3 py-1.5 transition-colors duration-200 hover:text-ink hover:border-ink"
        >
          <FilterIcon /> Filters{hasFilters ? " •" : ""}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className={`sm:w-56 shrink-0 space-y-4 ${filtersOpen ? "block" : "hidden"} sm:block`}>
          <div>
            <label className="block text-xs font-medium mb-1 text-steel">Search</label>
            <input
              value={search}
              onChange={(e) => updateFilter(setSearch, e.target.value)}
              placeholder="Part name, number…"
              className={selectClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-steel">Category</label>
            <select value={categoryId} onChange={(e) => updateFilter(setCategoryId, e.target.value)} className={selectClass}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-steel">Brand</label>
            <select value={brandId} onChange={(e) => updateFilter(setBrandId, e.target.value)} className={selectClass}>
              <option value="">All brands</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-steel">Condition</label>
            <select value={condition} onChange={(e) => updateFilter(setCondition, e.target.value)} className={selectClass}>
              <option value="">Any condition</option>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
              <option value="RECONDITIONED">Reconditioned</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-steel">Price range</label>
            <div className="flex gap-2">
              <input type="number" min="0" placeholder="Min" value={minPrice} onChange={(e) => updateFilter(setMinPrice, e.target.value)} className={selectClass} />
              <input type="number" min="0" placeholder="Max" value={maxPrice} onChange={(e) => updateFilter(setMaxPrice, e.target.value)} className={selectClass} />
            </div>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-steel underline transition-colors duration-200 hover:text-steel">
              Clear all filters
            </button>
          )}
        </aside>

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <p className="text-steel">Loading…</p>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-steel-light p-8 text-center text-steel">
              <p className="font-medium">No parts match your filters.</p>
              <button onClick={clearFilters} className="text-sm underline mt-2">Clear filters</button>
              <RequestProductForm prefillDescription={search ? `Looking for: ${search}` : ""} />
            </div>
          ) : (
            <>
              <p className="text-sm text-steel mb-4">
                {total} result{total !== 1 ? "s" : ""}
                {fuzzy && " — showing close matches for your search"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} eager />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-sm px-3 py-1.5 border border-steel-light rounded-lg transition-colors duration-200 hover:border-steel disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-steel">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-sm px-3 py-1.5 border border-steel-light rounded-lg transition-colors duration-200 hover:border-steel disabled:opacity-40 disabled:cursor-not-allowed"
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
    <Suspense fallback={<main className="max-w-6xl mx-auto px-4 py-10 text-steel">Loading…</main>}>
      <ProductsPageInner />
    </Suspense>
  );
}
