"use client";
import { useState } from "react";
import Image from "next/image";
import { isUnoptimizableImage } from "@/lib/image";

type ProductImage = { url: string; altText: string | null };

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M15.75 19.5L8.25 12l7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"}
      />
    </svg>
  );
}

export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full aspect-square bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
        No image
      </div>
    );
  }

  const active = images[index];
  const hasMultiple = images.length > 1;

  function prev() {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setIndex((i) => (i + 1) % images.length);
  }

  return (
    <div>
      <div className="relative w-full aspect-square rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 group">
        <Image
          key={active.url}
          src={active.url}
          alt={active.altText ?? productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized={isUnoptimizableImage(active.url)}
          className="object-cover"
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-zinc-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-zinc-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
            >
              <ChevronIcon direction="right" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 text-white text-xs px-2 py-0.5">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors duration-200 ${
                i === index ? "border-zinc-900" : "border-transparent hover:border-zinc-300"
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText ?? productName}
                fill
                sizes="64px"
                unoptimized={isUnoptimizableImage(img.url)}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
