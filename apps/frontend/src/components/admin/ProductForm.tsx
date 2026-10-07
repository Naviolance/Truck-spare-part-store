"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch, ApiRequestError, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { isUnoptimizableImage } from "@/lib/image";
import { parseCrossReferences } from "@/lib/part-numbers";
import { VehicleCompatibilityPicker } from "@/components/VehicleCompatibilityPicker";

type Option = { id: string; name: string };
type Condition = "NEW" | "USED" | "RECONDITIONED";

export type ProductFormValues = {
  name: string;
  description: string;
  descriptionFr: string;
  price: string;
  quantity: string;
  condition: Condition;
  conditionNotes: string;
  categoryId: string;
  brandId: string;
  partNumber: string;
  crossReference: string;
  imageUrls: string[];
  vehicleIds: string[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "", description: "", descriptionFr: "", price: "", quantity: "", condition: "NEW", conditionNotes: "",
  categoryId: "", brandId: "", partNumber: "", crossReference: "", imageUrls: [], vehicleIds: [],
};

// A photo is either already on the server (url) or picked on this device
// and not uploaded yet (file + a local preview url).
type Photo = { url: string; file?: File };

type Field = "photos" | "name" | "description" | "price" | "quantity" | "categoryId" | "conditionNotes";

function problems(v: ProductFormValues, photos: Photo[], requirePhoto: boolean): Field[] {
  const out: Field[] = [];
  if (requirePhoto && photos.length === 0) out.push("photos");
  if (v.name.trim().length < 3) out.push("name");
  if (!v.categoryId) out.push("categoryId");
  if (v.condition !== "NEW" && !v.conditionNotes.trim()) out.push("conditionNotes");
  if (!(Number(v.price) > 0)) out.push("price");
  if (v.quantity === "" || !(Number(v.quantity) >= 0)) out.push("quantity");
  if (v.description.trim().length < 10) out.push("description");
  return out;
}

// The product form (redesign step 6, option A), for both "new product" and
// "edit": one page of sections — photos, information, price and stock,
// trucks, descriptions — and a save bar pinned to the bottom of the screen.
//
// New photos stay on the device until Save: nothing is uploaded for a
// product that is never saved. They upload in order on save, so the first
// photo is still the cover.
export function ProductForm({ productId, initial }: { productId?: string; initial: ProductFormValues }) {
  const router = useRouter();
  const t = useTranslations("AdminProductForm");
  const tc = useTranslations("AdminCommon");
  const tCond = useTranslations("Condition");
  const apiError = useApiError();
  const isNew = !productId;
  const [values, setValues] = useState(initial);
  const [photos, setPhotos] = useState<Photo[]>(initial.imageUrls.map((url) => ({ url })));
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState<"DRAFT" | "PUBLISHED" | "SAVE" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    apiFetch("/categories").then((res) => res.json()).then(setCategories);
    apiFetch("/brands").then((res) => res.json()).then(setBrands);
    // Free the local previews when leaving the page.
    return () => photosRef.current.forEach((p) => p.file && URL.revokeObjectURL(p.url));
  }, []);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const dirty =
    JSON.stringify({ ...values, imageUrls: undefined }) !== JSON.stringify({ ...initial, imageUrls: undefined }) ||
    photos.map((p) => p.url).join() !== initial.imageUrls.join();
  const invalid = problems(values, photos, isNew);
  const err = (f: Field) => (showErrors && invalid.includes(f) ? t(`invalid.${f}`) : null);

  // Leaving with unsaved changes (closing the tab, reloading) asks first.
  useEffect(() => {
    if (!dirty || saving) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    e.target.value = ""; // the same file can be picked again later
  }
  function removePhoto(url: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.url === url);
      if (gone?.file) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.url !== url);
    });
  }
  // The cover is always the first photo.
  const makeCover = (url: string) => setPhotos((prev) => [...prev.filter((p) => p.url === url), ...prev.filter((p) => p.url !== url)]);

  async function uploadNewPhotos(): Promise<string[]> {
    const photoName = [values.name, brands.find((b) => b.id === values.brandId)?.name, values.partNumber].filter(Boolean).join(" ");
    const urls: string[] = [];
    for (const p of photos) {
      if (!p.file) {
        urls.push(p.url);
        continue;
      }
      const body = new FormData();
      // Text first (multer reads fields in order): it becomes the readable
      // file name, e.g. plaquettes-de-frein-avant-bosch-bp-29087-1a2b3c4d.webp.
      body.append("name", photoName);
      body.append("file", p.file);
      const res = await apiFetch("/uploads/image", { method: "POST", body, headers: {} });
      if (!res.ok) throw new ApiRequestError(await readApiError(res), "Image upload failed");
      urls.push((await res.json()).url);
    }
    return urls;
  }

  async function save(mode: "DRAFT" | "PUBLISHED" | "SAVE") {
    setError(null);
    if (invalid.length > 0) {
      setShowErrors(true);
      document.getElementById(`pf-${invalid[0]}`)?.focus();
      return;
    }
    setSaving(mode);
    let fallback = t("errors.imageUploadFailed");
    try {
      const imageUrls = await uploadNewPhotos();
      fallback = isNew ? t("errors.saveFailed") : t("errors.updateFailed");
      const body = {
        name: values.name,
        description: values.description,
        descriptionFr: values.descriptionFr || undefined,
        price: Number(values.price),
        quantity: Number(values.quantity),
        condition: values.condition,
        conditionNotes: values.conditionNotes || undefined,
        categoryId: values.categoryId,
        brandId: values.brandId || undefined,
        partNumber: values.partNumber || undefined,
        crossReference: parseCrossReferences(values.crossReference),
        imageUrls,
        vehicleIds: values.vehicleIds,
        ...(mode !== "SAVE" && { status: mode }),
      };
      const res = await apiFetch(isNew ? "/products" : `/products/${productId}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new ApiRequestError(await readApiError(res), "Failed to save product");
      router.push("/admin/products");
    } catch (e) {
      setError(apiError(e, fallback));
      setSaving(null);
    }
  }

  const input = (f: Field | null) => `admin-input ${f && err(f) ? "border-rust-dark" : ""}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(isNew ? "PUBLISHED" : "SAVE");
      }}
      noValidate
      className="mx-auto flex max-w-[900px] flex-col gap-4"
    >
      <Link
        href="/admin/products"
        onClick={(e) => {
          if (dirty && !saving && !confirm(t("discardConfirm"))) e.preventDefault();
        }}
        className="text-sm font-semibold text-steel hover:text-ink"
      >
        ← {t("backToProducts")}
      </Link>
      <h1 className="admin-title">{isNew ? t("createTitle") : t("editTitleNamed", { name: initial.name })}</h1>

      <Section title={t("photos")}>
        <p className="text-sm text-steel">{t("addPhotosHint")}</p>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div key={p.url} className={`relative aspect-square overflow-hidden rounded-[10px] bg-sand ${i === 0 ? "ring-2 ring-ink" : ""}`}>
              {p.file ? (
                // A local preview (object URL) next/image can't optimize.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Image src={p.url} alt="" fill sizes="180px" unoptimized={isUnoptimizableImage(p.url)} className="object-cover" />
              )}
              {i === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink px-2 text-xs font-bold text-paper">{t("cover")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(p.url)}
                  className="absolute bottom-1.5 left-1.5 rounded-full bg-card/90 px-2 text-xs font-bold text-ink hover:bg-card"
                >
                  {t("makeCover")}
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.url)}
                aria-label={t("removeImage")}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/75 text-paper hover:bg-ink"
              >
                ×
              </button>
            </div>
          ))}
          <button
            id="pf-photos"
            type="button"
            aria-describedby={err("photos") ? "pf-photos-error" : undefined}
            onClick={() => fileInput.current?.click()}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed bg-card font-bold text-steel hover:border-ink hover:text-ink ${err("photos") ? "border-rust-dark" : "border-[#BDB5A6]"}`}
          >
            <span aria-hidden="true" className="text-2xl leading-none">+</span>
            {t("addPhoto")}
          </button>
        </div>
        {/* Generic image/* (not a MIME list): some phone photo pickers only
            offer multi-select with it. The backend checks real file types. */}
        <input ref={fileInput} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
        <FieldError id="pf-photos-error" message={err("photos")} />
      </Section>

      <Section title={t("information")} grid>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="admin-label">
            {tc("name")}
            <input id="pf-name" aria-invalid={!!err("name")} aria-describedby={err("name") ? "pf-name-error" : undefined} value={values.name} onChange={(e) => set("name", e.target.value)} placeholder={t("namePlaceholder")} className={input("name")} />
          </label>
          <FieldError id="pf-name-error" message={err("name")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="admin-label">
            {t("category")}
            <select id="pf-categoryId" aria-invalid={!!err("categoryId")} aria-describedby={err("categoryId") ? "pf-categoryId-error" : undefined} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={input("categoryId")}>
              <option value="">{t("selectCategory")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <FieldError id="pf-categoryId-error" message={err("categoryId")} />
        </div>
        <label className="admin-label">
          {t("brandOptional")}
          <select value={values.brandId} onChange={(e) => set("brandId", e.target.value)} className="admin-input">
            <option value="">{t("noBrand")}</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="admin-label">
          {t("partNumberOptional")}
          <input value={values.partNumber} onChange={(e) => set("partNumber", e.target.value)} className="admin-input font-mono" />
        </label>
        <label className="admin-label">
          {t("crossReferenceOptional")}
          <input
            value={values.crossReference}
            onChange={(e) => set("crossReference", e.target.value)}
            placeholder={t("crossReferencePlaceholder")}
            className="admin-input font-mono"
          />
          <span className="text-sm font-normal text-steel">{t("crossReferenceHint")}</span>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 font-semibold text-ink">{t("condition")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["NEW", "USED", "RECONDITIONED"] as const).map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="condition" value={c} checked={values.condition === c} onChange={() => set("condition", c)} className="peer sr-only" />
                <span className="inline-flex h-11 items-center rounded-full border border-[#BDB5A6] px-4 font-semibold text-ink peer-checked:border-2 peer-checked:border-ink peer-checked:bg-[#F6E6C8] peer-checked:font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-amber">
                  {tCond(c)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {values.condition !== "NEW" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="admin-label">
              {t("conditionNotes")}
              <textarea
                id="pf-conditionNotes"
                aria-invalid={!!err("conditionNotes")}
                aria-describedby={err("conditionNotes") ? "pf-conditionNotes-error" : undefined}
                value={values.conditionNotes}
                onChange={(e) => set("conditionNotes", e.target.value)}
                placeholder={t("conditionNotesPlaceholder")}
                rows={2}
                className={`${input("conditionNotes")} h-auto py-2`}
              />
            </label>
            <FieldError id="pf-conditionNotes-error" message={err("conditionNotes")} />
          </div>
        )}
      </Section>

      <Section title={t("priceAndStock")} grid>
        <div className="flex flex-col gap-1.5">
          <label className="admin-label">
            {t("price")}
            <input id="pf-price" aria-invalid={!!err("price")} aria-describedby={err("price") ? "pf-price-error" : undefined} type="number" inputMode="numeric" min="1" step="1" value={values.price} onChange={(e) => set("price", e.target.value)} className={input("price")} />
          </label>
          <FieldError id="pf-price-error" message={err("price")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="admin-label">
            {t("quantity")}
            <input id="pf-quantity" aria-invalid={!!err("quantity")} aria-describedby={err("quantity") ? "pf-quantity-error" : undefined} type="number" inputMode="numeric" min="0" step="1" value={values.quantity} onChange={(e) => set("quantity", e.target.value)} className={input("quantity")} />
          </label>
          <FieldError id="pf-quantity-error" message={err("quantity")} />
        </div>
      </Section>

      <Section title={t("vehicles.label")}>
        <VehicleCompatibilityPicker selectedIds={values.vehicleIds} onChange={(ids) => set("vehicleIds", ids)} />
      </Section>

      <Section title={t("descriptions")}>
        <div className="flex flex-col gap-1.5">
          <label className="admin-label">
            {t("description")}
            <textarea id="pf-description" aria-invalid={!!err("description")} aria-describedby={err("description") ? "pf-description-error" : undefined} value={values.description} onChange={(e) => set("description", e.target.value)} rows={4} className={`${input("description")} h-auto py-2`} />
          </label>
          <FieldError id="pf-description-error" message={err("description")} />
        </div>
        <label className="admin-label">
          {t("frenchDescriptionOptional")}
          <textarea
            value={values.descriptionFr}
            onChange={(e) => set("descriptionFr", e.target.value)}
            placeholder={t("descriptionFrPlaceholder")}
            rows={3}
            className="admin-input h-auto py-2"
          />
        </label>
      </Section>

      {/* Pinned to the bottom of the screen while the form scrolls. */}
      <div className="sticky bottom-0 z-10 -mx-1 mb-2 flex flex-wrap items-center gap-2.5 rounded-[14px] bg-ink px-4 py-3 text-paper">
        <span role="status" className="mr-auto text-sm text-[#CFC8BA]">
          {saving
            ? t("uploading", { count: photos.filter((p) => p.file).length })
            : error ?? (showErrors && invalid.length > 0 ? t("fixErrors") : dirty ? t("unsaved") : t("noChanges"))}
        </span>
        {isNew ? (
          <>
            <button type="button" onClick={() => save("DRAFT")} disabled={!!saving} className="h-11 rounded-[10px] border border-[#CFC8BA] px-4 font-bold text-paper hover:bg-ink-soft disabled:opacity-50">
              {saving === "DRAFT" ? tc("saving") : t("saveDraft")}
            </button>
            <button type="submit" disabled={!!saving} className="btn-primary h-11 text-base">
              {saving === "PUBLISHED" ? t("posting") : t("post")}
            </button>
          </>
        ) : (
          <button type="submit" disabled={!!saving || !dirty} className="btn-primary h-11 text-base">
            {saving ? tc("saving") : t("saveChanges")}
          </button>
        )}
      </div>
    </form>
  );
}

function Section({ title, grid = false, children }: { title: string; grid?: boolean; children: ReactNode }) {
  return (
    <section className={`admin-card p-4 sm:p-5 ${grid ? "grid gap-3 sm:grid-cols-2" : "flex flex-col gap-3"}`}>
      <h2 className={`font-display text-[22px] font-bold text-ink ${grid ? "sm:col-span-2" : ""}`}>{title}</h2>
      {children}
    </section>
  );
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return <span id={id} className="text-sm font-semibold text-rust-dark">{message}</span>;
}
