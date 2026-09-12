"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { VehicleCompatibilityPicker } from "@/components/VehicleCompatibilityPicker";

type PickedImage = { file: File; url: string };
type Option = { id: string; name: string };

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
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

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
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/categories").then((res) => res.json()).then(setCategories);
    apiFetch("/brands").then((res) => res.json()).then(setBrands);
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

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
      return;
    }
    if (images.length > 0 && !confirm("Discard the images you've picked?")) return;
    images.forEach((img) => URL.revokeObjectURL(img.url));
    router.push("/admin/products");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-steel-light">
        <button onClick={handleBack} aria-label="Back" className="text-ink">
          <BackIcon />
        </button>
        <p className="text-sm font-medium text-steel">Step {step} of 4</p>
      </header>

      {step === 1 && (
        <div className="flex-1 p-4">
          <h1 className="text-lg font-display font-bold text-ink mb-1">Add photos</h1>
          <p className="text-sm text-steel mb-4">Pick one or more photos of the part. The first one becomes the cover image.</p>

          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={img.url} className="relative aspect-square rounded-lg overflow-hidden border border-steel-light bg-steel-light">
                {/* Object URLs aren't remote images next/image can optimize,
                    and this preview is discarded the moment the user moves
                    on - a plain img is the right tool here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-ink/80 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Remove image"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add photos"
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
          <h1 className="text-lg font-display font-bold text-ink mb-1">Details</h1>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input value={details.name} onChange={(e) => updateDetails("name", e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={details.description} onChange={(e) => updateDetails("description", e.target.value)} rows={3} className={fieldClass} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (French, optional)</label>
            <textarea
              value={details.descriptionFr}
              onChange={(e) => updateDetails("descriptionFr", e.target.value)}
              placeholder="Include the French product name in here — the name field itself stays untranslated, but this text is searched."
              rows={3}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Price (FCFA)</label>
              <input type="number" min="1" step="1" value={details.price} onChange={(e) => updateDetails("price", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" min="0" value={details.quantity} onChange={(e) => updateDetails("quantity", e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Condition</label>
            <select value={details.condition} onChange={(e) => updateDetails("condition", e.target.value as Details["condition"])} className={fieldClass}>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
              <option value="RECONDITIONED">Reconditioned</option>
            </select>
          </div>

          {details.condition !== "NEW" && (
            <div>
              <label className="block text-sm font-medium mb-1">Condition notes</label>
              <textarea
                value={details.conditionNotes}
                onChange={(e) => updateDetails("conditionNotes", e.target.value)}
                placeholder="Describe wear, testing, functionality, etc."
                rows={2}
                className={fieldClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={details.categoryId} onChange={(e) => updateDetails("categoryId", e.target.value)} className={fieldClass}>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Brand (optional)</label>
            <select value={details.brandId} onChange={(e) => updateDetails("brandId", e.target.value)} className={fieldClass}>
              <option value="">No brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Part number (optional)</label>
            <input value={details.partNumber} onChange={(e) => updateDetails("partNumber", e.target.value)} className={fieldClass} />
          </div>

          <VehicleCompatibilityPicker selectedIds={vehicleIds} onChange={setVehicleIds} />
        </div>
      )}

      {step > 2 && (
        <div className="flex-1 p-4 flex items-center justify-center text-steel text-sm">
          Step {step} isn't built yet — coming in the next pass.
        </div>
      )}

      <div className="p-4 border-t border-steel-light">
        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => setStep((s) => s + 1)}
          className="w-full bg-ink text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
