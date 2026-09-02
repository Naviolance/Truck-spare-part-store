"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type VehicleConfig = { id: string; manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null };
type Product = {
  id: string; slug: string; name: string; price: string; condition: string;
  images: { url: string }[]; category: { name: string }; brand: { name: string } | null;
};

export default function FindMyPartPage() {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [configs, setConfigs] = useState<VehicleConfig[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);

  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/vehicles/manufacturers`).then((r) => r.json()).then(setManufacturers);
  }, []);

  useEffect(() => {
    setModel("");
    setConfigs([]);
    setVehicleId("");
    setProducts(null);
    if (!manufacturer) return setModels([]);
    fetch(`${API_URL}/vehicles/models?manufacturer=${encodeURIComponent(manufacturer)}`)
      .then((r) => r.json())
      .then(setModels);
  }, [manufacturer]);

  useEffect(() => {
    setVehicleId("");
    setProducts(null);
    if (!manufacturer || !model) return setConfigs([]);
    fetch(`${API_URL}/vehicles/configs?manufacturer=${encodeURIComponent(manufacturer)}&model=${encodeURIComponent(model)}`)
      .then((r) => r.json())
      .then(setConfigs);
  }, [manufacturer, model]);

  useEffect(() => {
    if (!vehicleId) return setProducts(null);
    fetch(`${API_URL}/vehicles/${vehicleId}/products`)
      .then((r) => r.json())
      .then(setProducts);
  }, [vehicleId]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Find My Part</h1>
      <p className="text-gray-500 mb-8">Select your truck to see parts that fit.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div>
          <label className="block text-sm font-medium mb-1">Manufacturer</label>
          <select
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select…</option>
            {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!manufacturer}
            className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-50"
          >
            <option value="">Select…</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Year / Engine</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={!model}
            className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-50"
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
          <h2 className="font-semibold mb-4">
            {products.length > 0
              ? `${products.length} part${products.length !== 1 ? "s" : ""} found`
              : "No parts found for this vehicle yet"}
          </h2>

          {products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {product.images[0] && (
                    <div className="relative w-full h-40">
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized={isUnoptimizableImage(product.images[0].url)}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      {product.brand?.name ?? "Unbranded"} · {product.category.name}
                    </p>
                    <h3 className="font-semibold mt-1">{product.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold">{formatMoney(product.price)}</span>
                      <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">{product.condition}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}