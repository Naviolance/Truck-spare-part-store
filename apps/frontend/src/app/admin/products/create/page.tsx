"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseCrossReferences } from "@/lib/part-numbers";
import { useTranslations } from "next-intl";
import { apiFetch, ApiRequestError, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { formatMoney } from "@/lib/money";
import { ConditionTag } from "@/components/ProductCard";
import { VehicleCompatibilityPicker } from "@/components/VehicleCompatibilityPicker";

type PickedImage = { file: File; url: string };
type Option = { id: string; name: string };
type Vehicle = { id: string; manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null };

type Details = {
  name: string;
  description: string;
  descriptionFr: string;
  price: string;
  quantity: string;
  condition: "NEW" | "USED" | "RECONDITIONED";
  conditionNotes: string;
  categoryId: string;
  brandId: string;
  partNumber: string;
  crossReference: string;
};

const EMPTY_DETAILS: Details = {
  name: "",
  description: "",
  descriptionFr: "",
  price: "",
  quantity: "",
  condition: "NEW",
  conditionNotes: "",
  categoryId: "",
  brandId: "",
  partNumber: "",
  crossReference: "",
};

// Generic "image/*" rather than a narrow MIME list - some mobile browsers'
// native photo pickers only offer multi-select with the generic form; a
// specific list can make them fall back to single-select. The backend
// still validates actual file types on upload regardless.
const ACCEPTED_TYPES = "image/*";

const fieldClass = "w-full border border-steel-light rounded-lg px-3 py-2.5 text-sm";

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

// Step 1 picks photos, step 2 collects details, step 3 (preview) and step 4
// (draft/post) come next. Kept as one page with internal step state since
// the File objects picked in step 1 can't survive a route change, only
// in-memory component state.
export default function CreateProductPage() {
  const router = useRouter();
  const t = useTranslations("AdminProductForm");
  const tc = useTranslations("AdminCommon");
  const tCond = useTranslations("Condition");
  const apiError = useApiError();
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [saving, setSaving] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/categories").then((res) => res.json()).then(setCategories);
    apiFetch("/brands").then((res) => res.json()).then(setBrands);
    apiFetch("/vehicles/admin/all").then((res) => res.json()).then(setVehicles);
  }, []);

  function updateDetails<K extends keyof Details>(field: K, value: Details[K]) {
    setDetails((d) => ({ ...d, [field]: value }));
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const picked = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...picked]);
    e.target.value = ""; // allow re-picking the same file(s) later
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  const detailsValid =
    details.name.trim().length >= 3 &&
    details.description.trim().length >= 10 &&
    Number(details.price) > 0 &&
    details.quantity !== "" &&
    Number(details.quantity) >= 0 &&
    !!details.categoryId &&
    (details.condition === "NEW" || details.conditionNotes.trim().length > 0);

  const canAdvance = step === 1 ? images.length > 0 : step === 2 ? detailsValid : true;

  // Images are still local File objects at this point - nothing has been
  // uploaded yet, on purpose, so backing out of the flow before this never
  // orphans files on the server. One request per image, in picked order, so
  // imageUrls[0] stays the cover image.
  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of images) {
      const formData = new FormData();
      formData.append("file", img.file);
      const res = await apiFetch("/uploads/image", { method: "POST", body: formData, headers: {} });
      if (!res.ok) {
        throw new ApiRequestError(await readApiError(res), "Image upload failed");
      }
      const data = await res.json();
      urls.push(data.url);
    }
    return urls;
  }

  async function handleSave(status: "DRAFT" | "PUBLISHED") {
    setSaving(status);
    setSaveError(null);
    let fallback = t("errors.imageUploadFailed");
    try {
      const imageUrls = await uploadImages();
      fallback = t("errors.saveFailed");
      const res = await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          name: details.name,
          description: details.description,
          descriptionFr: details.descriptionFr || undefined,
          price: Number(details.price),
          quantity: Number(details.quantity),
          condition: details.condition,
          conditionNotes: details.conditionNotes || undefined,
          categoryId: details.categoryId,
          brandId: details.brandId || undefined,
          partNumber: details.partNumber || undefined,
          crossReference: parseCrossReferences(details.crossReference),
          imageUrls,
          vehicleIds,
          status,
        }),
      });
      if (!res.ok) {
        throw new ApiRequestError(await readApiError(res), "Failed to save product");
      }
      images.forEach((img) => URL.revokeObjectURL(img.url));
      router.push("/admin/products");
    } catch (err) {
      // ApiRequestError carries the backend's code; otherwise the step's fallback.
      setSaveError(apiError(err, fallback));
      setSaving(null);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
      return;
    }
    if (images.length > 0 && !confirm(t("discardConfirm"))) return;
    images.forEach((img) => URL.revokeObjectURL(img.url));
    router.push("/admin/products");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-steel-light">
        <button onClick={handleBack} disabled={!!saving} aria-label={t("back")} className="text-ink disabled:opacity-40">
          <BackIcon />
        </button>
        <p className="text-sm font-medium text-steel">{t("stepOf", { step, total: 4 })}</p>
      </header>

      {step === 1 && (
        <div className="flex-1 p-4">
          <h1 className="text-lg font-display font-bold text-ink mb-1">{t("addPhotos")}</h1>
          <p className="text-sm text-steel mb-4">{t("addPhotosHint")}</p>

          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={img.url} className="relative aspect-square rounded-lg overflow-hidden border border-steel-light bg-steel-light">
                {/* Object URLs aren't remote images next/image can optimize,
                    and this preview is discarded the moment the user moves
                    on - a plain img is the right tool here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-ink/80 text-white text-[10px] px-1.5 py-0.5 rounded">{t("cover")}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label={t("removeImage")}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("addPhotos")}
              className="aspect-square rounded-lg border-2 border-dashed border-steel-light flex items-center justify-center text-steel transition-colors duration-200 hover:border-steel hover:text-ink"
            >
              <PlusIcon />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 p-4 space-y-4">
          <h1 className="text-lg font-display font-bold text-ink mb-1">{t("details")}</h1>

          <div>
            <label className="block text-sm font-medium mb-1">{tc("name")}</label>
            <input value={details.name} onChange={(e) => updateDetails("name", e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("description")}</label>
            <textarea value={details.description} onChange={(e) => updateDetails("description", e.target.value)} rows={3} className={fieldClass} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("descriptionFrOptional")}</label>
            <textarea
              value={details.descriptionFr}
              onChange={(e) => updateDetails("descriptionFr", e.target.value)}
              placeholder={t("descriptionFrPlaceholder")}
              rows={3}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t("price")}</label>
              <input type="number" min="1" step="1" value={details.price} onChange={(e) => updateDetails("price", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("quantity")}</label>
              <input type="number" min="0" value={details.quantity} onChange={(e) => updateDetails("quantity", e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("condition")}</label>
            <select value={details.condition} onChange={(e) => updateDetails("condition", e.target.value as Details["condition"])} className={fieldClass}>
              <option value="NEW">{tCond("NEW")}</option>
              <option value="USED">{tCond("USED")}</option>
              <option value="RECONDITIONED">{tCond("RECONDITIONED")}</option>
            </select>
          </div>

          {details.condition !== "NEW" && (
            <div>
              <label className="block text-sm font-medium mb-1">{t("conditionNotes")}</label>
              <textarea
                value={details.conditionNotes}
                onChange={(e) => updateDetails("conditionNotes", e.target.value)}
                placeholder={t("conditionNotesPlaceholder")}
                rows={2}
                className={fieldClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t("category")}</label>
            <select value={details.categoryId} onChange={(e) => updateDetails("categoryId", e.target.value)} className={fieldClass}>
              <option value="">{t("selectCategory")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("brandOptional")}</label>
            <select value={details.brandId} onChange={(e) => updateDetails("brandId", e.target.value)} className={fieldClass}>
              <option value="">{t("noBrand")}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("partNumberOptional")}</label>
            <input value={details.partNumber} onChange={(e) => updateDetails("partNumber", e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("crossReferenceOptional")}</label>
            <input
              value={details.crossReference}
              onChange={(e) => updateDetails("crossReference", e.target.value)}
              placeholder={t("crossReferencePlaceholder")}
              className={`${fieldClass} font-mono`}
            />
          </div>

          <VehicleCompatibilityPicker selectedIds={vehicleIds} onChange={setVehicleIds} />
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 p-4">
          <h1 className="text-lg font-display font-bold text-ink mb-1">{t("preview.title")}</h1>
          <p className="text-sm text-steel mb-4">{t("preview.hint")}</p>

          <div className="relative aspect-square rounded-lg overflow-hidden border border-steel-light bg-steel-light">
            {images[previewIndex] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[previewIndex].url} alt="" className="w-full h-full object-cover" />
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setPreviewIndex(i)}
                  className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 ${i === previewIndex ? "border-ink" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-steel mt-4">
            {brands.find((b) => b.id === details.brandId)?.name ?? t("unbranded")} / {categories.find((c) => c.id === details.categoryId)?.name ?? "—"}
          </p>
          <h2 className="font-sans font-bold text-lg mt-1 text-ink leading-snug">{details.name || t("preview.untitled")}</h2>

          <div className="flex items-center justify-between flex-wrap gap-x-2 gap-y-1 mt-2">
            <p className="font-mono font-semibold text-lg text-ink">
              {details.price ? formatMoney(details.price) : "—"}
            </p>
            <ConditionTag condition={details.condition} />
          </div>

          <p className="text-sm text-ink/60 mt-1">{t("preview.inStock", { count: Number(details.quantity) || 0 })}</p>

          {details.conditionNotes && (
            <div className="mt-4 bg-amber/10 border-l-4 border-amber p-3 text-sm text-ink">
              <span className="font-medium">{t("preview.conditionNotesLabel")} </span>
              {details.conditionNotes}
            </div>
          )}

          <p className="text-steel mt-4 whitespace-pre-line leading-relaxed text-sm">{details.description}</p>

          {details.descriptionFr && (
            <div className="mt-3">
              <p className="text-xs font-medium text-steel mb-1">{t("preview.frenchDescription")}</p>
              <p className="text-steel whitespace-pre-line leading-relaxed text-sm">{details.descriptionFr}</p>
            </div>
          )}

          {(details.partNumber || vehicleIds.length > 0) && (
            <div className="mt-4 text-sm text-steel space-y-1">
              {details.partNumber && <p>{t.rich("preview.partNumber", { number: details.partNumber, mono: (chunks) => <span className="font-mono">{chunks}</span> })}</p>}
              {vehicleIds.length > 0 && (
                <p>
                  {t("preview.fits", {
                    vehicles: vehicles.filter((v) => vehicleIds.includes(v.id)).map((v) => `${v.manufacturer} ${v.model}`).join(", "),
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 p-4">
          <h1 className="text-lg font-display font-bold text-ink mb-1">{t("ready.title")}</h1>
          <p className="text-sm text-steel mb-4">
            {t("ready.hint")}
          </p>
          {saveError && <p className="text-sm text-red-600 mb-4">{saveError}</p>}
          {saving && (
            <p className="text-sm text-steel mb-4">
              {t(saving === "DRAFT" ? "ready.uploadingDraft" : "ready.uploadingPost", { count: images.length })}
            </p>
          )}
        </div>
      )}

      <div className="sticky bottom-0 bg-paper p-4 border-t border-steel-light">
        {step < 4 ? (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
            className="w-full bg-ink text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40"
          >
            {t("next")}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!!saving}
              onClick={() => handleSave("DRAFT")}
              className="flex-1 border border-steel-light rounded-lg py-3 text-sm font-medium disabled:opacity-40"
            >
              {saving === "DRAFT" ? tc("saving") : t("saveDraft")}
            </button>
            <button
              type="button"
              disabled={!!saving}
              onClick={() => handleSave("PUBLISHED")}
              className="flex-1 bg-ink text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40"
            >
              {saving === "PUBLISHED" ? t("posting") : t("post")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
