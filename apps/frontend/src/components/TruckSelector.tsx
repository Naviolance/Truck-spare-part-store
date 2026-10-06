"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type Config = { id: string; yearStart: number; yearEnd: number | null; engine: string | null };

const selectClass =
  "w-full border border-steel-light rounded-lg px-3 py-2.5 bg-white transition-colors duration-200 focus:outline-none focus:border-ink disabled:bg-paper disabled:text-steel";

// Make -> model -> year/engine. Each choice updates the URL, so the page
// re-renders on the server with matching parts and the link can be shared
// ("here are the parts for my Actros").
export function TruckSelector({
  manufacturers,
  models,
  configs,
  current,
}: {
  manufacturers: string[];
  models: string[];
  configs: Config[];
  current: { manufacturer?: string; model?: string; vehicleId?: string };
}) {
  const t = useTranslations("FindMyPart");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: { manufacturer?: string; model?: string; vehicleId?: string }) {
    const params = new URLSearchParams();
    if (next.manufacturer) params.set("manufacturer", next.manufacturer);
    if (next.model) params.set("model", next.model);
    if (next.vehicleId) params.set("vehicleId", next.vehicleId);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/find-my-part?${qs}` : "/find-my-part", { scroll: false }));
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      <div>
        <label htmlFor="truck-make" className="block text-sm font-medium mb-1 text-steel">{t("manufacturer")}</label>
        <select id="truck-make" value={current.manufacturer ?? ""} onChange={(e) => go({ manufacturer: e.target.value })} className={selectClass}>
          <option value="">{t("select")}</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="truck-model" className="block text-sm font-medium mb-1 text-steel">{t("model")}</label>
        <select
          id="truck-model"
          value={current.model ?? ""}
          disabled={!current.manufacturer}
          onChange={(e) => go({ manufacturer: current.manufacturer, model: e.target.value })}
          className={selectClass}
        >
          <option value="">{t("select")}</option>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="truck-config" className="block text-sm font-medium mb-1 text-steel">{t("config")}</label>
        <select
          id="truck-config"
          value={current.vehicleId ?? ""}
          disabled={!current.model}
          onChange={(e) => go({ manufacturer: current.manufacturer, model: current.model, vehicleId: e.target.value })}
          className={selectClass}
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
      </div>
    </div>
  );
}
