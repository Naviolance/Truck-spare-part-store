import "server-only";
import { serverFetch } from "./server-api";
import type { CatalogOption } from "./catalog";

// Data for the category / brand / truck landing pages and the sitemap.
// Cached for 5 minutes: these lists change when the admin edits the catalog,
// not per visitor.

export type TruckMake = {
  manufacturer: string;
  slug: string;
  products: number;
  models: { model: string; slug: string; products: number }[];
};

export const getCategories = () => serverFetch<CatalogOption[]>("/categories", { revalidate: 300 });
export const getBrands = () => serverFetch<CatalogOption[]>("/brands", { revalidate: 300 });
export const getTruckCatalog = () => serverFetch<TruckMake[]>("/vehicles/catalog", { revalidate: 300 });

export const productCount = (option: CatalogOption) => option._count?.products ?? 0;
