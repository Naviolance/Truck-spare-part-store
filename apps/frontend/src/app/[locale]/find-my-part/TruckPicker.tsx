"use client";
import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ProductGridSkeleton } from "@/components/Skeletons";

export type MakeTile = { manufacturer: string; products: number; models: { model: string; products: number }[] };
type Config = { id: string; yearStart: number; yearEnd: number | null; engine: string | null };
type Current = { manufacturer?: string; model?: string; vehicleId?: string };

function pickerHref(next: Current): string {
  const params = new URLSearchParams();
  if (next.manufacturer) params.set("manufacturer", next.manufacturer);
  if (next.model) params.set("model", next.model);
  if (next.vehicleId) params.set("vehicleId", next.vehicleId);
  const qs = params.toString();
  return qs ? `/find-my-part?${qs}` : "/find-my-part";
}

// Find My Part (redesign step 5, option B): tap a make, then a model — the
// matching parts (`children`, server-rendered) show right below, on the
// same page. Every choice is a real link (works without JavaScript, can be
// shared, Back steps through it); with JavaScript, clicks here and in the
// results (pagination, filter pills) run in a transition so the results
// area shows a skeleton in place instead of the whole page changing
// (data-inline-loading turns NavigationSkeleton off for this page).
export function TruckPicker({
  makes,
  configs,
  current,
  children,
}: {
  makes: MakeTile[];
  configs: Config[];
  current: Current;
  children: ReactNode;
}) {
  const t = useTranslations("FindMyPart");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const results = useRef<HTMLDivElement>(null);
  const shownFor = useRef(current.model ? `${current.manufacturer}|${current.model}` : "");

  const go = (href: string) => startTransition(() => router.push(href, { scroll: false }));
  const selected = makes.find((m) => m.manufacturer === current.manufacturer);

  // A newly picked model: bring its parts into view (on phones they start
  // below the fold). Not on first load — a shared link already lands here.
  useEffect(() => {
    const key = current.model ? `${current.manufacturer}|${current.model}` : "";
    if (key && key !== shownFor.current && !pending) results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!pending) shownFor.current = key;
  }, [current.manufacturer, current.model, pending]);

  // Same-page links inside the results (pagination, active-filter pills)
  // get the in-place loading too.
  function onResultsClick(e: React.MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    if (!href) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.endsWith(pathname)) return;
    e.preventDefault();
    go(`${pathname}${url.search}`);
  }

  const tile = (on: boolean) =>
    `flex min-h-[92px] flex-col items-start justify-center gap-1 rounded-[14px] p-4 text-left transition-colors ${
      on ? "border-2 border-ink bg-ink text-paper" : "border border-line bg-card text-ink hover:border-ink"
    }`;
  const pill = (on: boolean) =>
    `inline-flex h-12 items-center gap-1.5 rounded-full px-[18px] text-[17px] font-bold transition-colors ${
      on ? "border-2 border-ink bg-amber text-ink" : "border border-[#BDB5A6] bg-card text-ink hover:border-ink"
    }`;
  const link = (href: string) => ({
    href,
    scroll: false,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go(href);
    },
  });

  return (
    <div data-inline-loading className="flex flex-col gap-6">
      <section aria-labelledby="fmp-makes" className="flex flex-col gap-3">
        <h2 id="fmp-makes" className="text-[15px] font-bold uppercase tracking-wide text-steel">{t("makeStep")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {makes.map((m) => {
            const on = m.manufacturer === current.manufacturer;
            return (
              <Link key={m.manufacturer} {...link(pickerHref({ manufacturer: m.manufacturer }))} aria-current={on ? "true" : undefined} className={tile(on)}>
                <span className="font-display text-2xl font-bold leading-tight">{m.manufacturer}</span>
                <span className="text-sm opacity-80">{t("partsCount", { count: m.products })}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {selected && (
        <section aria-labelledby="fmp-models" className="flex flex-col gap-3">
          <h2 id="fmp-models" className="text-[15px] font-bold uppercase tracking-wide text-steel">
            {t("modelStep", { make: selected.manufacturer })}
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {selected.models.map((m) => {
              const on = m.model === current.model;
              return (
                <Link
                  key={m.model}
                  {...link(pickerHref({ manufacturer: selected.manufacturer, model: m.model }))}
                  aria-current={on ? "true" : undefined}
                  className={pill(on)}
                >
                  {m.model} <span className="font-normal opacity-75">· {m.products}</span>
                </Link>
              );
            })}
            {current.model && configs.length > 0 && (
              <label className="ml-1 flex items-center gap-2 text-sm text-steel">
                {t("config")}
                <select
                  value={current.vehicleId ?? ""}
                  onChange={(e) => go(pickerHref({ ...current, vehicleId: e.target.value || undefined }))}
                  className="h-12 rounded-[10px] border border-[#BDB5A6] bg-white px-3 text-base text-ink focus:border-ink focus:outline-none"
                >
                  <option value="">{t("anyConfig")}</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.yearStart}
                      {c.yearEnd ? `–${c.yearEnd}` : "+"}
                      {c.engine ? ` · ${c.engine}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>
      )}

      {/* Clears the pinned header when scrolled into view. */}
      <div ref={results} className="scroll-mt-[136px]" onClickCapture={onResultsClick} aria-busy={pending}>
        {pending ? (
          <div role="status" className="flex flex-col gap-5">
            <span className="sr-only">{t("loadingParts")}</span>
            <div aria-hidden="true" className="flex flex-col gap-2">
              <div className="skeleton h-8 w-72 max-w-full" />
              <div className="skeleton h-4 w-40" />
            </div>
            <div aria-hidden="true">
              <ProductGridSkeleton count={6} />
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
