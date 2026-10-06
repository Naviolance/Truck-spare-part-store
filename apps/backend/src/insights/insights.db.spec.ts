import { randomUUID } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { InsightsService, normalizeTerm } from "./insights.service";

describe("normalizeTerm", () => {
  it("collapses spacing and case so one term is one row", () => {
    expect(normalizeTerm("  Filtre   à HUILE ")).toBe("filtre à huile");
  });
});

// Real Postgres (pnpm test:db).
const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb("insights (real database)", () => {
  const prisma = new PrismaService();
  const insights = new InsightsService(prisma);
  const tag = randomUUID().slice(0, 8);
  const missing = `zz-missing-${tag}`;
  const found = `found-${tag}`;

  beforeAll(() => prisma.$connect());
  afterAll(async () => {
    await prisma.searchStat.deleteMany({ where: { term: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("counts concurrent identical searches exactly (no lost updates)", async () => {
    await Promise.all(Array.from({ length: 50 }, () => insights.record({ type: "search", term: missing.toUpperCase(), results: 0 })));
    const [row] = await prisma.searchStat.findMany({ where: { term: missing } });
    expect(row).toMatchObject({ searches: 50, zeroResults: 50 });
  });

  it("summary lists searches that found nothing, and keeps found ones out of that list", async () => {
    await insights.record({ type: "search", term: found, results: 3 });
    await insights.record({ type: "search", term: found, results: 3 });
    const summary = await insights.summary(30);
    expect(summary.notFound.find((r) => r.term === missing)?.times).toBe(50);
    expect(summary.notFound.find((r) => r.term === found)).toBeUndefined();
    expect(summary.topSearches.find((r) => r.term === found)?.times).toBe(2);
  });

  it("ignores one-letter searches", async () => {
    await insights.record({ type: "search", term: " x ", results: 0 });
    expect(await prisma.searchStat.count({ where: { term: "x" } })).toBe(0);
  });

  it("counts WhatsApp clicks per button", async () => {
    const before = (await insights.summary(1)).whatsappBySource.find((r) => r.source === "about")?.clicks ?? 0;
    await Promise.all([1, 2, 3].map(() => insights.record({ type: "whatsapp", source: "about" })));
    const after = (await insights.summary(1)).whatsappBySource.find((r) => r.source === "about")?.clicks;
    expect(after).toBe(before + 3);
  });
});
