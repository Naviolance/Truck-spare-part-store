"use client";
import { useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

type Props = {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
};

export function ImageUploader({ imageUrls, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Don't set Content-Type manually here — the browser needs to set its
      // own multipart boundary, which apiFetch would otherwise override.
      const res = await apiFetch("/uploads/image", {
        method: "POST",
        body: formData,
        headers: {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }

      const data = await res.json();
      onChange([...imageUrls, data.url]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same file if needed
    }
  }

  function removeImage(url: string) {
    onChange(imageUrls.filter((u) => u !== url));
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Product images</label>

      {imageUrls.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative w-20 h-20">
              <Image src={url} alt="" fill sizes="80px" className="object-cover rounded border border-gray-200" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}