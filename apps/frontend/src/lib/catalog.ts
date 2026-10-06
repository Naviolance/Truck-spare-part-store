import type { ProductCardData } from "@/components/ProductCard";

// The catalog's URL <-> API contract, shared by the server-rendered
// CatalogView, its client-side filters and pagination, so they always agree
// on what "the current filters" are.

export const PAGE_SIZE = 24;

export type CatalogQuery = {
  search?: string;
  categoryId?: string;
  brandId?: string;
  condition?: "NEW" | "USED" | "RECONDITIONED";
  minPrice?: string;
  maxPrice?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  inStock?: "true";
  manufacturer?: string;
  model?: string;
  vehicleId?: string;
  page?: number;
};

export type ProductList = {
  items: ProductCardData[];
  total: number;
  page: number;
  totalPages: number;
  fuzzy?: boolean;
};

export type CatalogOption = { id: string; name: string; nameFr?: string | null; slug: string; _count?: { products: number } };

// A category's name in the page's language (categories have an optional
// French name; brands are proper nouns and don't).
export function categoryName(category: { name: string; nameFr?: string | null }, locale: string): string {
  return locale === "fr" && category.nameFr ? category.nameFr : category.name;
}

type RawParams = Record<string, string | string[] | undefined>;

const CONDITIONS = ["NEW", "USED", "RECONDITIONED"] as const;
const SORTS = ["newest", "price_asc", "price_desc"] as const;

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed.slice(0, 100) : undefined;
}

function price(value: string | string[] | undefined): string | undefined {
  const v = one(value);
  return v && /^\d{1,10}$/.test(v) ? v : undefined;
}

// Untrusted URL params -> a clean query (invalid values are dropped, never passed on).
export function parseCatalogParams(params: RawParams): CatalogQuery {
  const condition = one(params.condition);
  const sort = one(params.sort);
  const page = Number(one(params.page));
  return {
    search: one(params.search),
    categoryId: one(params.categoryId),
    brandId: one(params.brandId),
    condition: CONDITIONS.find((c) => c === condition),
    minPrice: price(params.minPrice),
    maxPrice: price(params.maxPrice),
    sort: SORTS.find((s) => s === sort),
    inStock: one(params.inStock) === "true" ? "true" : undefined,
    manufacturer: one(params.manufacturer),
    model: one(params.model),
    vehicleId: one(params.vehicleId),
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 1000) : undefined,
  };
}

function toParams(q: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) {
    if (value === undefined || value === "" || (key === "page" && value === 1)) continue;
    params.set(key, String(value));
  }
  return params;
}

// Query string for a catalog URL ("" when there are no filters).
export function catalogHref(basePath: string, q: CatalogQuery): string {
  const qs = toParams(q).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function apiProductsPath(q: CatalogQuery): string {
  const params = toParams(q);
  params.set("limit", String(PAGE_SIZE));
  return `/products?${params.toString()}`;
}

// Filtered/searched views are kept out of the index (they'd be thousands of
// near-duplicate URLs); pagination alone stays indexable. Landing pages
// (category, brand, truck) are the indexable versions of those filters.
export function isFilteredView(q: CatalogQuery): boolean {
  return Object.entries(q).some(([key, value]) => key !== "page" && value !== undefined);
}
