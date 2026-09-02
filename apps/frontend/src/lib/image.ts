// placehold.co serves SVG placeholder images (used for seed/demo data) — Next's
// built-in image optimizer can't reliably transform those, so skip optimization
// for that host and let the browser fetch it directly, same as a real product photo would.
export function isUnoptimizableImage(url: string): boolean {
  return url.includes("placehold.co");
}
