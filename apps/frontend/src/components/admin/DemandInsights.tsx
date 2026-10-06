"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Summary = {
  days: number;
  searches: number;
  zeroResultSearches: number;
  notFound: { term: string; times: number; lastDay: string }[];
  topSearches: { term: string; times: number }[];
  whatsappClicks: number;
  whatsappBySource: { source: string; clicks: number }[];
};

// Readable names for WhatsAppButton's `source` values (backend whitelist:
// insights/dto/insight-event.dto.ts).
const SOURCE_LABELS: Record<string, string> = {
  product: "Product page",
  product_out_of_stock: "Product page (out of stock)",
  footer: "Footer button",
  footer_icon: "Footer icon",
  floating: "Floating button",
  order: "Order page",
  about: "About page",
  find_my_part_photo: "Find My Part (send a photo)",
  request_form: "Part request form",
};

const PERIODS = [7, 30, 90];

// What customers want, from the store's own daily totals (insights module):
// searches that found nothing = parts to stock next.
export function DemandInsights() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let current = true;
    apiFetch(`/insights/summary?days=${days}`).then(async (res) => {
      if (current && res.ok) setData(await res.json());
    });
    return () => {
      current = false;
    };
  }, [days]);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-lg font-display font-semibold text-ink">Customer demand</h2>
        <div className="inline-flex rounded-full border border-steel-light overflow-hidden text-xs" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              aria-pressed={days === p}
              className={`px-3 py-1.5 ${days === p ? "bg-ink text-white" : "text-steel hover:text-ink"}`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="text-steel text-sm">Loading…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white border border-steel-light rounded-lg p-4 lg:col-span-2">
            <p className="text-sm text-steel">
              Searched but <strong className="text-ink">not found</strong>
              <span className="ml-1">
                ({data.zeroResultSearches.toLocaleString()} of {data.searches.toLocaleString()} searches)
              </span>
            </p>
            <p className="text-xs text-steel mb-3">Parts customers want that the catalog doesn&apos;t have — stock or add them first.</p>
            {data.notFound.length === 0 ? (
              <p className="text-sm text-steel">Nothing yet — every search found something.</p>
            ) : (
              <ol className="divide-y divide-steel-light text-sm">
                {data.notFound.map((r) => (
                  <li key={r.term} className="flex items-center justify-between gap-3 py-2">
                    <a
                      href={`/fr/products?search=${encodeURIComponent(r.term)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink hover:underline truncate"
                      title="Open this search on the store"
                    >
                      {r.term}
                    </a>
                    <span className="shrink-0 text-steel">
                      {r.times}× · last {new Date(r.lastDay).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-steel-light rounded-lg p-4">
              <p className="text-sm text-steel">WhatsApp clicks</p>
              <p className="text-2xl font-bold text-ink mb-2">{data.whatsappClicks.toLocaleString()}</p>
              {data.whatsappBySource.length > 0 && (
                <ul className="text-sm space-y-1">
                  {data.whatsappBySource.map((r) => (
                    <li key={r.source} className="flex justify-between gap-3">
                      <span className="text-steel">{SOURCE_LABELS[r.source] ?? r.source}</span>
                      <span className="text-ink font-medium">{r.clicks}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white border border-steel-light rounded-lg p-4">
              <p className="text-sm text-steel mb-2">Top searches</p>
              {data.topSearches.length === 0 ? (
                <p className="text-sm text-steel">No searches yet.</p>
              ) : (
                <ol className="text-sm space-y-1">
                  {data.topSearches.slice(0, 10).map((r) => (
                    <li key={r.term} className="flex justify-between gap-3">
                      <span className="text-ink truncate">{r.term}</span>
                      <span className="text-steel shrink-0">{r.times}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
