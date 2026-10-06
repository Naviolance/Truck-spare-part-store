import { randomBytes } from "crypto";

// ORD-YYYYMMDD-XXXXXXXX. 8 hex chars from a CSPRNG (4 billion values per
// day) instead of Math.random's 6 base-36 chars, so a collision with the
// orderNumber unique constraint — which would fail the checkout — is
// practically impossible.
export function generateOrderNumber(): string {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `ORD-${datePart}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
