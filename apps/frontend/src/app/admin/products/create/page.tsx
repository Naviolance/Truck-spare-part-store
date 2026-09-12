"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PickedImage = { file: File; url: string };

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

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

// Step 1 of the post-style creation flow: pick one or more images before
// anything else, same as opening a social app's composer starts with media,
// not a form. Later steps (details, preview, draft/post) build on this -
// kept as one page with internal step state since File objects picked here
// can't survive a route change, only in-memory component state.
export default function CreateProductPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<PickedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleBack() {
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

      {step > 1 && (
        <div className="flex-1 p-4 flex items-center justify-center text-steel text-sm">
          Step {step} isn't built yet — coming in the next pass.
        </div>
      )}

      <div className="p-4 border-t border-steel-light">
        <button
          type="button"
          disabled={images.length === 0}
          onClick={() => setStep((s) => s + 1)}
          className="w-full bg-ink text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
