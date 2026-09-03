"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";
import { publicFetch } from "@/lib/api";

type Product = {
  id: string; slug: string; name: string; price: string; condition: string;
  images: { url: string }[];
};

export function RelatedProducts({ categoryIds, excludeProductIds }: { categoryIds: string[]; excludeProductIds: string[] }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (categoryIds.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;

    Promise.all(
      categoryIds.map((categoryId) =>
        publicFetch(`/products?categoryId=${categoryId}&limit=4`)
          .then((r) => (r.ok ? r.json() : { items: [] }))
          .then((data) => data.items as Product[])
          .catch(() => [] as Product[]),
      ),
    ).then((results) => {
      if (cancelled) return;
      const seen = new Set(excludeProductIds);
      const merged: Product[] = [];
      // Round-robin across categories so one category's results can't
      // monopolize the final list — take one from each list per pass.
      const maxLen = Math.max(0, ...results.map((list) => list.length));
      for (let i = 0; i < maxLen && merged.length < 4; i++) {
        for (const list of results) {
          if (merged.length >= 4) break;
          const p = list[i];
          if (!p || seen.has(p.id)) continue;
          seen.add(p.id);
          merged.push(p);
        }
      }
      setProducts(merged);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIds.join(","), excludeProductIds.join(",")]);

  if (products.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-zinc-200">
      <h2 className="text-lg font-bold text-zinc-900 tracking-tight mb-4">You might also need</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:border-zinc-300"
          >
            {product.images[0] && (
              <div className="relative w-full h-32 overflow-hidden">
                <Image
                  src={product.images[0].url}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized={isUnoptimizableImage(product.images[0].url)}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-medium text-zinc-900 line-clamp-2">{product.name}</p>
              <p className="text-sm font-semibold text-zinc-600 mt-1">{formatMoney(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
