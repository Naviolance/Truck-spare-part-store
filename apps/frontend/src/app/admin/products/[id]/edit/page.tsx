"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { parseCrossReferences } from "@/lib/part-numbers";
import { useTranslations } from "next-intl";
import { apiFetch, ApiRequestError, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { isUnoptimizableImage } from "@/lib/image";
import { ConditionTag } from "@/components/ProductCard";
import { VehicleCompatibilityPicker } from "@/components/VehicleCompatibilityPicker";

type Option = { id: string; name: string };

const fieldClass = "w-full border border-steel-light rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-ink transition-colors";
const labelClass = "block text-xs font-medium text-steel mb-1";
const sectionClass = "mt-6 pt-6 border-t border-steel-light";

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
  const t = useTranslations("AdminProductForm");
  const tc = useTranslations("AdminCommon");
  const tCond = useTranslations("Condition");
  const apiError = useApiError();
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
    categoryId: "", brandId: "", partNumber: "", crossReference: "", conditionNotes: "",
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
        crossReference: (p.crossReference ?? []).join(", "),
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
        throw new ApiRequestError(await readApiError(res), "Upload failed");
      }
      const data = await res.json();
      setImageUrls((prev) => [...prev, data.url]);
    } catch (err) {
      setPhotoError(apiError(err, t("errors.uploadFailed")));
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
        crossReference: parseCrossReferences(form.crossReference),
        descriptionFr: form.descriptionFr || undefined,
        price: Number(form.price),
        quantity: Number(form.quantity),
        brandId: form.brandId || undefined,
        imageUrls,
        vehicleIds,
      }),
    });
    if (!res.ok) {
      setError(apiError(await readApiError(res), t("errors.updateFailed")));
      setSaving(false);
      return;
    }
    router.push("/admin/products");
  }

  if (loading) return <p className="text-steel">{tc("loading")}</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight">{t("editTitle")}</h1>
        <button type="button" onClick={() => router.push("/admin/products")} className="text-sm text-steel transition-colors duration-200 hover:text-ink">
          {tc("cancel")}
        </button>
      </div>

      <div>
        <p className={labelClass}>{t("photos")}</p>
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
            <div className="w-full h-full flex items-center justify-center text-steel text-sm">{t("noPhotos")}</div>
          )}
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto">
          {imageUrls.map((url, i) => (
            <div key={url} className="relative w-16 h-16 shrink-0">
              <button
                type="button"
                onClick={() => makeCover(url)}
                aria-label={i === 0 ? t("coverImage") : t("setAsCover")}
                className={`relative block w-16 h-16 rounded-lg overflow-hidden border-2 ${i === 0 ? "border-ink" : "border-transparent"}`}
              >
                <Image src={url} alt="" fill sizes="64px" unoptimized={isUnoptimizableImage(url)} className="object-cover" />
              </button>
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label={t("removeImage")}
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
            aria-label={t("addPhoto")}
            className="w-16 h-16 shrink-0 rounded-lg border-2 border-dashed border-steel-light flex items-center justify-center text-steel transition-colors duration-200 hover:border-steel hover:text-ink disabled:opacity-50"
          >
            {uploadingPhoto ? "…" : <PlusIcon />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAddPhoto} className="hidden" />
        </div>
        {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}

        <div className={sectionClass}>
          <div>
            <label htmlFor="edit-name" className={labelClass}>{tc("name")}</label>
            <input
              id="edit-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("namePlaceholder")}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label htmlFor="edit-brand" className={labelClass}>{t("brand")}</label>
              <select id="edit-brand" value={form.brandId} onChange={(e) => update("brandId", e.target.value)} className={fieldClass}>
                <option value="">{t("unbranded")}</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="edit-category" className={labelClass}>{t("category")}</label>
              <select id="edit-category" value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} className={fieldClass}>
                <option value="">{t("selectCategory")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>
              <label htmlFor="edit-price" className={labelClass}>{t("price")}</label>
              <input
                id="edit-price"
                type="number"
                min="1"
                step="1"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className={`${fieldClass} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="edit-quantity" className={labelClass}>{t("quantity")}</label>
              <input
                id="edit-quantity"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="edit-condition" className={labelClass}>{t("condition")}</label>
              <select
                id="edit-condition"
                value={form.condition}
                onChange={(e) => update("condition", e.target.value)}
                className={fieldClass}
              >
                <option value="NEW">{tCond("NEW")}</option>
                <option value="USED">{tCond("USED")}</option>
                <option value="RECONDITIONED">{tCond("RECONDITIONED")}</option>
              </select>
            </div>
          </div>
          <div className="mt-1">
            <ConditionTag condition={form.condition} />
          </div>

          {form.condition !== "NEW" && (
            <div className="mt-4">
              <label htmlFor="edit-condition-notes" className={labelClass}>{t("conditionNotes")}</label>
              <textarea
                id="edit-condition-notes"
                value={form.conditionNotes}
                onChange={(e) => update("conditionNotes", e.target.value)}
                placeholder={t("conditionNotesPlaceholder")}
                rows={2}
                className={`${fieldClass} resize-none`}
              />
            </div>
          )}
        </div>

        <div className={sectionClass}>
          <label htmlFor="edit-description" className={labelClass}>{t("description")}</label>
          <textarea
            id="edit-description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={4}
            className={`${fieldClass} resize-none`}
          />

          <div className="mt-4">
            <label htmlFor="edit-description-fr" className={labelClass}>{t("frenchDescriptionOptional")}</label>
            <textarea
              id="edit-description-fr"
              value={form.descriptionFr}
              onChange={(e) => update("descriptionFr", e.target.value)}
              placeholder={t("descriptionFrPlaceholder")}
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="edit-part-number" className={labelClass}>{t("partNumberOptional")}</label>
            <input
              id="edit-part-number"
              value={form.partNumber}
              onChange={(e) => update("partNumber", e.target.value)}
              className={`${fieldClass} font-mono`}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="edit-cross-ref" className={labelClass}>{t("crossReferenceOptional")}</label>
            <input
              id="edit-cross-ref"
              value={form.crossReference}
              onChange={(e) => update("crossReference", e.target.value)}
              placeholder={t("crossReferencePlaceholder")}
              className={`${fieldClass} font-mono`}
            />
            <p className="text-xs text-steel mt-1">{t("crossReferenceHint")}</p>
          </div>
        </div>

        <div className={sectionClass}>
          <VehicleCompatibilityPicker selectedIds={vehicleIds} onChange={setVehicleIds} />
        </div>

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>

      <div className="sticky bottom-0 bg-paper py-4 mt-2 border-t border-steel-light">
        <button type="submit" disabled={saving} className="w-full bg-ink text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40">
          {saving ? tc("saving") : t("saveChanges")}
        </button>
      </div>
    </form>
  );
}
