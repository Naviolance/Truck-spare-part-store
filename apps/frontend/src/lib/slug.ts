// Same algorithm as the backend's common/utils/slugify.ts, so truck links
// built here ("/trucks/mercedes-benz/actros") match the slugs the backend
// returns from /vehicles/catalog. Change both together.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
