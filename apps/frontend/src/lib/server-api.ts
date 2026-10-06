import "server-only";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// For server components, sitemap and metadata: calls the backend directly
// (not through the /api/backend browser proxy) and identifies itself with
// INTERNAL_API_KEY so these requests — which all come from the same few
// server IPs — aren't rate limited as if they were one visitor.
//
// `revalidate` caches the response for that many seconds (Next's data
// cache): public catalog pages don't need to hit the API on every view.
// Returns null on any failure so a page can degrade instead of crashing.
export async function serverFetch<T>(path: string, { revalidate = 60 }: { revalidate?: number | false } = {}): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: process.env.INTERNAL_API_KEY ? { "x-internal-api-key": process.env.INTERNAL_API_KEY } : {},
      ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// A 404 from the API is a real "doesn't exist" (render notFound()); anything
// else (API down, 500) is NOT — the page should show an error, not tell
// Google the product is gone.
export async function serverFetchOrMissing<T>(path: string, revalidate = 60): Promise<{ data: T | null; missing: boolean }> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: process.env.INTERNAL_API_KEY ? { "x-internal-api-key": process.env.INTERNAL_API_KEY } : {},
    next: { revalidate },
  });
  if (res.status === 404) return { data: null, missing: true };
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return { data: (await res.json()) as T, missing: false };
}
