"use client";
import { useEffect, useState } from "react";
import { ProductCard, ProductCardData } from "@/components/ProductCard";
import { publicFetch } from "@/lib/api";

type VehicleConfig = { id: string; manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null };

export default function FindMyPartPage() {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [configs, setConfigs] = useState<VehicleConfig[]>([]);
  const [products, setProducts] = useState<ProductCardData[] | null>(null);

  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  useEffect(() => {
    publicFetch(`/vehicles/manufacturers`).then((r) => r.json()).then(setManufacturers);
  }, []);

  useEffect(() => {
    setModel("");
    setConfigs([]);
    setVehicleId("");
    setProducts(null);
    if (!manufacturer) return setModels([]);
    publicFetch(`/vehicles/models?manufacturer=${encodeURIComponent(manufacturer)}`)
      .then((r) => r.json())
      .then(setModels);
  }, [manufacturer]);

  useEffect(() => {
    setVehicleId("");
    setProducts(null);
    if (!manufacturer || !model) return setConfigs([]);
    publicFetch(`/vehicles/configs?manufacturer=${encodeURIComponent(manufacturer)}&model=${encodeURIComponent(model)}`)
      .then((r) => r.json())
      .then(setConfigs);
  }, [manufacturer, model]);

  useEffect(() => {
    if (!vehicleId) return setProducts(null);
    publicFetch(`/vehicles/${vehicleId}/products`)
      .then((r) => r.json())
      .then(setProducts);
  }, [vehicleId]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-1">Find My Part</h1>
      <p className="text-zinc-500 mb-8">Select your truck to see parts that fit.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Manufacturer</label>
          <select
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500"
          >
            <option value="">Select…</option>
            {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!manufacturer}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500 disabled:bg-zinc-50"
          >
            <option value="">Select…</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Year / Engine</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={!model}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500 disabled:bg-zinc-50"
          >
            <option value="">Select…</option>
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.yearStart}{c.yearEnd ? `–${c.yearEnd}` : "+"}{c.engine ? ` · ${c.engine}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products !== null && (
        <div>
          <h2 className="font-semibold text-zinc-900 mb-4">
            {products.length > 0
              ? `${products.length} part${products.length !== 1 ? "s" : ""} found`
              : "No parts found for this vehicle yet"}
          </h2>

          {products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}