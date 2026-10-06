import { slugify } from "./slugify";

// A URL slug for `name` that isn't taken yet: "oil-filter", then
// "oil-filter-1", "oil-filter-2"... `isTaken` checks the database (or any
// store); `reserved` covers slugs handed out earlier in the same batch but
// not written yet (bulk import).
export async function uniqueSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
  reserved: Set<string> = new Set(),
): Promise<string> {
  const base = slugify(name) || "item";
  let slug = base;
  for (let suffix = 1; reserved.has(slug) || (await isTaken(slug)); suffix++) {
    slug = `${base}-${suffix}`;
  }
  reserved.add(slug);
  return slug;
}
