import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { InsightEventDto } from "./dto/insight-event.dto";

// The store's day, not UTC's: "today" on the dashboard is the owner's today.
const STORE_DAY = `(now() AT TIME ZONE 'Africa/Douala')::date`;

// "  Filtre  à HUILE " -> "filtre à huile": one row per thing people typed,
// however they spaced or capitalised it.
export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 100);
}

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  // One atomic INSERT ... ON CONFLICT per event: two searches landing at the
  // same moment both count (a Prisma upsert can fail with a duplicate key
  // in that race).
  async record(event: InsightEventDto) {
    if (event.type === "search") {
      const term = normalizeTerm(event.term ?? "");
      if (term.length < 2) return;
      const zero = event.results === 0 ? 1 : 0;
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO search_stats (day, term, searches, "zeroResults") VALUES (${STORE_DAY}, $1, 1, $2)
         ON CONFLICT (day, term) DO UPDATE SET searches = search_stats.searches + 1,
                                               "zeroResults" = search_stats."zeroResults" + EXCLUDED."zeroResults"`,
        term,
        zero,
      );
    } else {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO whatsapp_click_stats (day, source, clicks) VALUES (${STORE_DAY}, $1, 1)
         ON CONFLICT (day, source) DO UPDATE SET clicks = whatsapp_click_stats.clicks + 1`,
        event.source,
      );
    }
  }

  // Dashboard: the last `days` days, today included.
  async summary(days: number) {
    const since = `${STORE_DAY} - ${days - 1}`;
    const [notFound, topSearches, totals, whatsapp] = await Promise.all([
      // Demand the store isn't serving: what to stock next.
      this.prisma.$queryRawUnsafe<{ term: string; times: number; lastDay: Date }[]>(
        `SELECT term, sum("zeroResults")::int AS times, max(day) AS "lastDay" FROM search_stats
          WHERE day >= ${since} GROUP BY term HAVING sum("zeroResults") > 0
          ORDER BY times DESC, "lastDay" DESC LIMIT 20`,
      ),
      this.prisma.$queryRawUnsafe<{ term: string; times: number }[]>(
        `SELECT term, sum(searches)::int AS times FROM search_stats
          WHERE day >= ${since} GROUP BY term ORDER BY times DESC, term LIMIT 20`,
      ),
      this.prisma.$queryRawUnsafe<{ searches: number; zeroResults: number }[]>(
        `SELECT coalesce(sum(searches), 0)::int AS searches, coalesce(sum("zeroResults"), 0)::int AS "zeroResults"
           FROM search_stats WHERE day >= ${since}`,
      ),
      this.prisma.$queryRawUnsafe<{ source: string; clicks: number }[]>(
        `SELECT source, sum(clicks)::int AS clicks FROM whatsapp_click_stats
          WHERE day >= ${since} GROUP BY source ORDER BY clicks DESC`,
      ),
    ]);
    return {
      days,
      searches: totals[0].searches,
      zeroResultSearches: totals[0].zeroResults,
      notFound,
      topSearches,
      whatsappClicks: whatsapp.reduce((sum, row) => sum + row.clicks, 0),
      whatsappBySource: whatsapp,
    };
  }
}
