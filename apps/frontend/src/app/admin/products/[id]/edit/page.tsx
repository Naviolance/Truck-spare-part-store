"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { isUnoptimizableImage } from "@/lib/image";
import { VehicleCompatibilityPicker } from "@/components/VehicleCompatibilityPicker";

type Option = { id: string; name: string };

const CONDITION_SELECT_CLASS: Record<string, string> = {
  NEW: "tag-new",
  USED: "tag-used",
  RECONDITIONED: "tag-reconditioned",
};

// Borderless by default, a line appears on hover/focus - the goal is that
// this reads as the live listing (same as the create flow's preview step),
// not as a form, while still making every field obviously editable.
const inlineInput =
  "bg-transparent border-b border-transparent hover:border-steel-light focus:border-ink focus:outline-none transition-colors";
const inlineTextarea = `${inlineInput} w-full resize-none leading-relaxed`;

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", descriptionFr: "", price: "", quantity: "", condition: "NEW",
    categoryId: "", brandId: "", partNumber: "", conditionNotes: "",
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);

  useEffect(() => {
    apiFetch("/categories").then((res) => res.json()).then(setCategories);
    apiFetch("/brands").then((res) => res.json()).then(setBrands);
    apiFetch(`/products/admin/${id}`).then(async (res) => {
      const p = await res.json();
      setForm({
        name: p.name, description: p.description, descriptionFr: p.descriptionFr || "", price: String(p.price), quantity: String(p.quantity),
        condition: p.condition, categoryId: p.categoryId, brandId: p.brandId || "", partNumber: p.partNumber || "",
        conditionNotes: p.conditionNotes || "",
      });
      setImageUrls(p.images?.map((img: { url: string }) => img.url) ?? []);
      setVehicleIds(p.compatibility?.map((c: { vehicleId: string }) => c.vehicleId) ?? []);
      setLoading(false);
    });
  }, [id]);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch("/uploads/image", { method: "POST", body: formData, headers: {} });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setImageUrls((prev) => [...prev, data.url]);
    } catch (err: any) {
      setPhotoError(err.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  // The cover image is always imageUrls[0] - clicking another thumbnail
  // promotes it to the front rather than just changing what's previewed.
  function makeCover(url: string) {
    setImageUrls((prev) => [url, ...prev.filter((u) => u !== url)]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await apiFetch(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...form,
        descriptionFr: form.descriptionFr || undefined,
        price: Number(form.price),
        quantity: Number(form.quantity),
        brandId: form.brandId || undefined,
        imageUrls,
        vehicleIds,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to update product");
      setSaving(false);
      return;
    }
    router.push("/admin/products");
  }

  if (loading) return <p className="text-steel">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight">Edit product</h1>
        <button type="button" onClick={() => router.push("/admin/products")} className="text-sm text-steel transition-colors duration-200 hover:text-ink">
          Cancel
        </button>
      </div>

      <div>
        <div className="relative aspect-square rounded-lg overflow-hidden border border-steel-light bg-steel-light">
          {imageUrls[0] ? (
            <Image
              src={imageUrls[0]}
              alt=""
              fill
              sizes="600px"
              unoptimized={isUnoptimizableImage(imageUrls[0])}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-steel text-sm">No photos yet</div>
          )}
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto">
          {imageUrls.map((url, i) => (
            <div key={url} className="relative w-16 h-16 shrink-0">
              <button
                type="button"
                onClick={() => makeCover(url)}
                aria-label={i === 0 ? "Cover image" : "Set as cover"}
                className={`relative block w-16 h-16 rounded-lg overflow-hidden border-2 ${i === 0 ? "border-ink" : "border-transparent"}`}
              >
                <Image src={url} alt="" fill sizes="64px" unoptimized={isUnoptimizableImage(url)} className="object-cover" />
              </button>
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Remove image"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs leading-none"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            aria-label="Add photo"
            className="w-16 h-16 shrink-0 rounded-lg border-2 border-dashed border-steel-light flex items-center justify-center text-steel transition-colors duration-200 hover:border-steel hover:text-ink disabled:opacity-50"
          >
            {uploadingPhoto ? "…" : <PlusIcon />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAddPhoto} className="hidden" />
        </div>
        {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}

        <div className="flex items-center gap-1 text-sm mt-4">
          <select value={form.brandId} onChange={(e) => update("brandId", e.target.value)} className={`${inlineInput} text-steel`}>
            <option value="">Unbranded</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <span className="text-steel">/</span>
          <select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} className={`${inlineInput} text-steel`}>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Product name"
          className={`${inlineInput} font-sans font-bold text-lg mt-1 text-ink leading-snug w-full`}
        />

        <div className="flex items-center justify-between flex-wrap gap-x-2 gap-y-1 mt-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className={`${inlineInput} font-mono font-semibold text-lg text-ink w-28`}
            />
            <span className="text-steel text-sm">FCFA</span>
          </div>
          <select
            value={form.condition}
            onChange={(e) => update("condition", e.target.value)}
            className={`${CONDITION_SELECT_CLASS[form.condition]} border-0 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-ink`}
          >
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="RECONDITIONED">Reconditioned</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-ink/60 mt-1">
          <input
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className={`${inlineInput} w-16`}
          />
          <span>in stock</span>
        </div>

        {form.condition !== "NEW" && (
          <div className="mt-4 bg-amber/10 border-l-4 border-amber p-3 text-sm text-ink">
            <span className="font-medium block mb-1">Condition notes</span>
            <textarea
              value={form.conditionNotes}
              onChange={(e) => update("conditionNotes", e.target.value)}
              placeholder="Describe wear, testing, functionality, etc."
              rows={2}
              className={inlineTextarea}
            />
          </div>
        )}

        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className={`${inlineTextarea} text-steel mt-4 text-sm`}
        />

        <div className="mt-3">
          <p className="text-xs font-medium text-steel mb-1">French description (optional)</p>
          <textarea
            value={form.descriptionFr}
            onChange={(e) => update("descriptionFr", e.target.value)}
            rows={3}
            className={`${inlineTextarea} text-steel text-sm`}
          />
        </div>

        <div className="mt-4 text-sm text-steel">
          <label className="block text-xs font-medium mb-1">Part number</label>
          <input
            value={form.partNumber}
            onChange={(e) => update("partNumber", e.target.value)}
            className={`${inlineInput} font-mono w-full`}
          />
        </div>

        <div className="mt-4">
          <VehicleCompatibilityPicker selectedIds={vehicleIds} onChange={setVehicleIds} />
        </div>

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>

      <div className="sticky bottom-0 bg-paper py-4 mt-2 border-t border-steel-light">
        <button type="submit" disabled={saving} className="w-full bg-ink text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
