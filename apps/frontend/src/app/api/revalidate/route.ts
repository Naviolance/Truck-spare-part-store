import { timingSafeEqual } from "crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/server-api";

// Called by the backend after an admin changes the catalog
// (common/catalog-cache in apps/backend): marks every cached catalog
// response and page stale, so the next visitor sees the edit. Protected by
// the INTERNAL_API_KEY both apps already share.
export async function POST(request: Request) {
  const expected = process.env.INTERNAL_API_KEY;
  const given = request.headers.get("x-internal-api-key") ?? "";
  if (!expected || !safeEqual(given, expected)) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  revalidateTag(CATALOG_TAG);
  return Response.json({ revalidated: true });
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
