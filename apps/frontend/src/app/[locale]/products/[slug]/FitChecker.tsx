"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { whatsappLink } from "@/lib/site";

export type Fit = { manufacturer: string; model: string; years: string; engine: string | null; href: string };
export type MakeOption = { manufacturer: string; models: string[] };

const same = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;

// "Does this fit my truck?" (redesign step 3, option B). The answer comes
// from the product's own compatibility list, so it needs no API call. A
// truck that isn't listed gets "not in our list — ask us", never "doesn't
// fit": the list can be incomplete, and a question on WhatsApp is a lead.
export function FitChecker({
  fits,
  makes,
  productLabel,
  productUrl,
}: {
  fits: Fit[];
  makes: MakeOption[];
  productLabel: string; // name (+ part number) for the WhatsApp message
  productUrl: string;
}) {
  const t = useTranslations("Product");
  const tf = useTranslations("FindMyPart");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const models = makes.find((m) => m.manufacturer === make)?.models ?? [];

  const truck = `${make} ${model}`;
  const matches = make && model ? fits.filter((f) => same(f.manufacturer, make) && same(f.model, model)) : [];
  const answered = Boolean(make && model);
  const ask = whatsappLink(t("fitWhatsappMessage", { product: productLabel, truck, url: productUrl }));

  const select =
    "h-12 w-full rounded-[10px] border-0 bg-card px-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-amber disabled:opacity-60";

  return (
    <section aria-labelledby="fit-title" className="flex flex-col gap-3.5 rounded-[14px] bg-ink p-5 sm:p-6 text-paper">
      <h2 id="fit-title" className="font-display text-2xl font-bold">{t("fitTitle")}</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5 text-sm text-paper-dim">
          {tf("manufacturer")}
          <select
            value={make}
            onChange={(e) => {
              setMake(e.target.value);
              setModel("");
            }}
            className={select}
          >
            <option value="">{tf("select")}</option>
            {makes.map((m) => (
              <option key={m.manufacturer} value={m.manufacturer}>{m.manufacturer}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-paper-dim">
          {tf("model")}
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              if (e.target.value) track("fit_check", { result: fits.some((f) => same(f.manufacturer, make) && same(f.model, e.target.value)) ? "fits" : "not_listed" });
            }}
            disabled={!make}
            className={select}
          >
            <option value="">{tf("select")}</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>

      <div role="status" aria-live="polite">
        {answered && matches.length > 0 && (
          <p className="flex items-start gap-2.5 rounded-[10px] bg-stock-bg px-3.5 py-3 text-base font-bold text-[#1F4D28]">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l4 4 10-10" />
            </svg>
            {t("fitYes", { truck: `${truck} (${matches.map((f) => f.years + (f.engine ? ` · ${f.engine}` : "")).join(", ")})` })}
          </p>
        )}
        {answered && matches.length === 0 && (
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[10px] bg-[#F1DCD5] px-3.5 py-3 text-base text-[#7A2F1B]">
            <strong>{t("fitNo", { truck })}</strong>
            {ask && (
              <a
                href={ask}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("whatsapp_click", { from: "fit_check" })}
                className="font-bold text-[#7A2F1B] underline underline-offset-2"
              >
                {t("fitAsk")}
              </a>
            )}
          </p>
        )}
      </div>

      {/* The full list stays on the page as real links (truck landing pages),
          for shoppers who'd rather read it, and for search engines. */}
      {fits.length > 0 ? (
        <p className="text-sm text-paper-dim">
          {t("fitList")}{" "}
          {fits.map((f, i) => (
            <span key={`${f.manufacturer}-${f.model}-${i}`}>
              {i > 0 && " · "}
              <Link href={f.href} className="text-paper underline-offset-2 hover:underline">
                {f.manufacturer} {f.model}
              </Link>{" "}
              ({f.years}{f.engine && ` · ${f.engine}`})
            </span>
          ))}
        </p>
      ) : (
        <p className="text-sm text-paper-dim">{t("fitsUnknown")}</p>
      )}
    </section>
  );
}
