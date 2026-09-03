import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: string;
  condition: string;
  images: { url: string; altText?: string | null }[];
  category: { name: string };
  brand: { name: string } | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-300"
    >
      {product.images[0] && (
        <div className="relative w-full h-40 overflow-hidden">
          <Image
            src={product.images[0].url}
            alt={product.images[0].altText ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={isUnoptimizableImage(product.images[0].url)}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          {product.brand?.name ?? "Unbranded"} · {product.category.name}
        </p>
        <h2 className="font-semibold mt-1 text-zinc-900">{product.name}</h2>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-zinc-900">{formatMoney(product.price)}</span>
          <span className="text-xs rounded-full bg-zinc-100 text-zinc-600 px-2 py-0.5">{product.condition}</span>
        </div>
      </div>
    </Link>
  );
}
