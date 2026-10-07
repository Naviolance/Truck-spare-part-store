"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { announceNavigation } from "@/lib/navigation-events";

type Make = { manufacturer: string; models: { model: string; products: number }[] };

const selectClass =
  "h-12 w-full rounded-[10px] border border-[#BDB5A6] bg-white px-3 text-base text-ink focus:border-ink focus:outline-none disabled:bg-paper disabled:text-steel";

// The homepage's "What do you drive?" card: pick make and model, then go to
// Find My Part with them (the same URL its truck tiles use). It's a form:
// nothing happens until "show parts" is pressed.
export function HeroTruckFinder({ makes }: { makes: Make[] }) {
  const t = useTranslations("FindMyPart");
  const locale = useLocale();
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const models = makes.find((m) => m.manufacturer === manufacturer)?.models.filter((m) => m.products > 0) ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (manufacturer) params.set("manufacturer", manufacturer);
    if (model) params.set("model", model);
    const qs = params.toString();
    const href = `/${locale}/find-my-part${qs ? `?${qs}` : ""}`;
    announceNavigation(href);
    router.push(href);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-2xl bg-card p-5 sm:p-6 text-ink">
      <p className="font-display text-2xl font-bold">{t("whatDoYouDrive")}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5 text-sm text-steel">
          {t("manufacturer")}
          <select
            value={manufacturer}
            onChange={(e) => {
              setManufacturer(e.target.value);
              setModel("");
            }}
            className={selectClass}
          >
            <option value="">{t("select")}</option>
            {makes.map((m) => (
              <option key={m.manufacturer} value={m.manufacturer}>
                {m.manufacturer}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-steel">
          {t("model")}
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={!manufacturer} className={selectClass}>
            <option value="">{t("select")}</option>
            {models.map((m) => (
              <option key={m.model} value={m.model}>
                {m.model}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="btn-primary h-12 text-base">
        {t("showParts")}
      </button>
    </form>
  );
}
