"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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

// WhatsAppButton's `source` values have readable names under
// AdminDashboard.sources (backend whitelist: insights/dto/insight-event.dto.ts).

const PERIODS = [7, 30, 90];

// What customers want, from the store's own daily totals (insights module):
// searches that found nothing = parts to stock next.
export function DemandInsights() {
  const t = useTranslations("AdminDashboard");
  const locale = useLocale();
  const n = (value: number) => value.toLocaleString(locale);
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
    <section>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-display text-2xl font-bold text-ink">{t("demandTitle")}</h2>
        <div className="inline-flex rounded-full border border-line overflow-hidden text-sm" role="group" aria-label={t("period")}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              aria-pressed={days === p}
              className={`px-3 py-1.5 ${days === p ? "bg-ink text-paper" : "bg-card text-steel hover:text-ink"}`}
            >
              {t("days", { days: p })}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="text-steel text-sm">{t("loading")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[14px] border border-line bg-card p-4 lg:col-span-2">
            <p className="text-sm text-steel">
              {t.rich("notFoundTitle", { strong: (chunks) => <strong className="text-ink">{chunks}</strong> })}
              <span className="ml-1">{t("notFoundCount", { zero: n(data.zeroResultSearches), total: n(data.searches) })}</span>
            </p>
            <p className="text-xs text-steel mb-3">{t("notFoundHint")}</p>
            {data.notFound.length === 0 ? (
              <p className="text-sm text-steel">{t("notFoundEmpty")}</p>
            ) : (
              <ol className="divide-y divide-sand text-sm">
                {data.notFound.map((r) => (
                  <li key={r.term} className="flex items-center justify-between gap-3 py-2">
                    <a
                      href={`/fr/products?search=${encodeURIComponent(r.term)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink hover:underline truncate"
                      title={t("openSearch")}
                    >
                      {r.term}
                    </a>
                    <span className="shrink-0 text-steel">
                      {t("timesLast", { times: r.times, date: new Date(r.lastDay).toLocaleDateString(locale) })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[14px] border border-line bg-card p-4">
              <p className="text-sm text-steel">{t("whatsappClicks")}</p>
              <p className="text-2xl font-bold text-ink mb-2">{n(data.whatsappClicks)}</p>
              {/* Bar chart: which buttons customers use to reach the shop. */}
              {data.whatsappBySource.length > 0 && (
                <ul className="flex flex-col gap-2 text-sm">
                  {data.whatsappBySource.map((r) => {
                    const max = Math.max(...data.whatsappBySource.map((x) => x.clicks), 1);
                    return (
                      <li key={r.source} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2.5">
                        <span className="truncate text-steel">{t.has(`sources.${r.source}`) ? t(`sources.${r.source}`) : r.source}</span>
                        <span className="h-2.5 rounded-full bg-sand" aria-hidden="true">
                          <span className="block h-full rounded-full bg-amber" style={{ width: `${(r.clicks / max) * 100}%` }} />
                        </span>
                        <span className="font-semibold text-ink">{n(r.clicks)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="rounded-[14px] border border-line bg-card p-4">
              <p className="text-sm text-steel mb-2">{t("topSearches")}</p>
              {data.topSearches.length === 0 ? (
                <p className="text-sm text-steel">{t("noSearches")}</p>
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
