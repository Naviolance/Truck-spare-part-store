"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Vehicle = { id: string; manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null };

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function VehicleCompatibilityPicker({ selectedIds, onChange }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    apiFetch("/vehicles/admin/all").then((res) => res.json()).then(setVehicles);
  }, []);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Compatible vehicles</label>
      <div className="border border-gray-300 rounded max-h-40 overflow-y-auto p-2 space-y-1">
        {vehicles.length === 0 && <p className="text-xs text-gray-400 p-1">No vehicles added yet — add some in Admin → Vehicles.</p>}
        {vehicles.map((v) => (
          <label key={v.id} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.includes(v.id)}
              onChange={() => toggle(v.id)}
            />
            {v.manufacturer} {v.model} ({v.yearStart}{v.yearEnd ? `–${v.yearEnd}` : "+"}){v.engine && ` · ${v.engine}`}
          </label>
        ))}
      </div>
    </div>
  );
}