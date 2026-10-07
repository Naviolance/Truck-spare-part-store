import { randomBytes, randomUUID } from "crypto";
import { slugify } from "../common/utils/slugify";

// Storage keys for product photos.
//
// New uploads get a readable name built from the product (name, brand, part
// number) plus a random suffix: products/plaquettes-de-frein-bosch-bp-29087-1a2b3c4d.webp.
// Search engines read file names as a hint about what a photo shows; the
// suffix keeps every key unique, so a URL's content never changes (the
// file route caches it for a year).
//
// The public file route serves only keys this service creates, nothing
// else that might be in the bucket:
//   - products/<slug>-<8 hex>.webp      readable names (current)
//   - products/<uuid>.webp              uploads from 13 Sep to now
//   - products/<uuid>.<jpeg|png|...>    uploads before 13 Sep, stored as sent
export const IMAGE_KEY_RE =
  /^products\/(?:[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}\.webp|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9]{2,5})$/;

const MAX_NAME_LENGTH = 80;

export function imageKey(name?: string): string {
  // Accents dropped first ("détachées" → "detachees"), then slugified.
  const slug = slugify((name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    .slice(0, MAX_NAME_LENGTH)
    .replace(/-+$/, "");
  return slug ? `products/${slug}-${randomBytes(4).toString("hex")}.webp` : `products/${randomUUID()}.webp`;
}
