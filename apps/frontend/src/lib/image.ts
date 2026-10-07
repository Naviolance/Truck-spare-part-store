// placehold.co serves SVG placeholder images (used for seed/demo data) — Next's
// built-in image optimizer can't reliably transform those, so skip optimization
// for that host and let the browser fetch it directly, same as a real product photo would.
export function isUnoptimizableImage(url: string): boolean {
  return url.includes("placehold.co");
}

// Text alternative for a product photo when the admin didn't write one:
// "Plaquettes de frein avant – Bosch BP-29087", plus "(2)" for later photos.
// Screen readers read it, and it's search engines' main clue to what a
// photo shows (with the file name and the text around it).
export function productImageAlt(
  product: { name: string; brand?: { name: string } | null; partNumber?: string | null },
  index = 0,
): string {
  const detail = [product.brand?.name, product.partNumber].filter(Boolean).join(" ");
  const base = detail ? `${product.name} – ${detail}` : product.name;
  return index > 0 ? `${base} (${index + 1})` : base;
}
