"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";

type Vehicle = { id: string; manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null };

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

const label = (v: Vehicle) =>
  `${v.manufacturer} ${v.model} ${v.yearStart}${v.yearEnd ? `–${v.yearEnd}` : "+"}${v.engine ? ` · ${v.engine}` : ""}`;

// Chosen trucks as removable chips; "Add a truck" opens a searchable list
// (the catalog can hold dozens of truck configurations).
export function VehicleCompatibilityPicker({ selectedIds, onChange }: Props) {
  const t = useTranslations("AdminProductForm");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/vehicles/admin/all").then((res) => res.json()).then(setVehicles);
  }, []);

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const chosen = selectedIds.map((id) => vehicles.find((v) => v.id === id)).filter((v): v is Vehicle => !!v);
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = vehicles.filter((v) => words.every((w) => label(v).toLowerCase().includes(w)));

  return (
    <div className="flex flex-col gap-3">
      {vehicles.length === 0 ? (
        <p className="text-sm text-steel">{t("vehicles.empty")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {chosen.length === 0 && <p className="w-full text-sm text-steel">{t("vehicles.none")}</p>}
          {chosen.map((v) => (
            <span key={v.id} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink pl-3.5 pr-1.5 font-semibold text-paper">
              {label(v)}
              <button
                type="button"
                onClick={() => toggle(v.id)}
                aria-label={t("vehicles.remove", { name: label(v) })}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-soft hover:bg-rust"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex h-10 items-center rounded-full border border-dashed border-ink px-3.5 font-bold text-ink hover:bg-sand"
          >
            {open ? t("vehicles.done") : t("vehicles.add")}
          </button>
        </div>
      )}
      {open && (
        <div className="rounded-[10px] border border-[#BDB5A6] bg-white">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("vehicles.search")}
            aria-label={t("vehicles.search")}
            autoFocus
            className="h-11 w-full rounded-t-[10px] border-b border-sand px-3 focus:outline-none"
          />
          <div className="max-h-60 overflow-y-auto p-1">
            {matches.map((v) => (
              <label key={v.id} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 hover:bg-paper">
                <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggle(v.id)} className="h-4 w-4 accent-ink" />
                <span className="text-ink">{label(v)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
