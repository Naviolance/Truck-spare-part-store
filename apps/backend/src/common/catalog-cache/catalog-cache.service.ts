import { Injectable, Logger } from "@nestjs/common";

// Tells the Next.js frontend that catalog data changed, so public pages show
// an admin's edit immediately instead of after their cache expires (~60 s).
// The frontend's POST /api/revalidate calls revalidateTag("catalog"), which
// marks every cached catalog response and page stale; the next visitor gets
// fresh data. See apps/frontend/src/app/api/revalidate/route.ts.
//
// Only admin catalog writes trigger it (@RevalidatesCatalog). Stock changes
// from customer orders deliberately don't: many orders a minute would keep
// wiping the cache, and checkout re-checks stock anyway.
@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);
  private timer: NodeJS.Timeout | null = null;

  // Bursts (an admin saving several things, an import) become one call.
  catalogChanged() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.notifyFrontend();
    }, 300);
  }

  private async notifyFrontend() {
    const frontend = process.env.FRONTEND_INTERNAL_URL || process.env.FRONTEND_URL;
    const key = process.env.INTERNAL_API_KEY;
    if (!frontend || !key) return; // not configured (e.g. unit tests): pages just expire normally
    try {
      const res = await fetch(`${frontend.replace(/\/$/, "")}/api/revalidate`, {
        method: "POST",
        headers: { "x-internal-api-key": key },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) this.logger.warn(`Frontend revalidation answered ${res.status}`);
    } catch (err) {
      // Never fails the admin's request: worst case, pages refresh within a minute.
      this.logger.warn(`Frontend revalidation failed: ${(err as Error).message}`);
    }
  }
}
