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

// Color coding is functional here, not decorative - it's the same
// distinction a yard makes tagging a physical part, surfaced consistently
// everywhere a condition shows up (cards, product page, admin tables).
const CONDITION_TAG: Record<string, { label: string; className: string }> = {
  NEW: { label: "New", className: "tag-new" },
  USED: { label: "Used", className: "tag-used" },
  RECONDITIONED: { label: "Reconditioned", className: "tag-reconditioned" },
};

export function ConditionTag({ condition }: { condition: string }) {
  const tag = CONDITION_TAG[condition] ?? { label: condition, className: "tag-condition bg-steel/15 text-steel" };
  return <span className={tag.className}>{tag.label}</span>;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative bg-white border border-steel-light overflow-hidden transition-colors duration-200 hover:border-ink"
    >
      {product.images[0] && (
        <div className="relative w-full h-40 overflow-hidden bg-steel-light">
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
        <p className="text-xs text-steel">
          {product.brand?.name ?? "Unbranded"} / {product.category.name}
        </p>
        <h2 className="font-sans font-bold mt-1 text-ink leading-snug">{product.name}</h2>
        <div className="flex items-center justify-between flex-wrap gap-x-2 gap-y-1 mt-2">
          <p className="font-mono font-semibold text-lg text-ink">{formatMoney(product.price)}</p>
          <ConditionTag condition={product.condition} />
        </div>
      </div>
    </Link>
  );
}
