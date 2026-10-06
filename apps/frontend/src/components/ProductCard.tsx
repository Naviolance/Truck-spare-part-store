import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: string;
  condition: string;
  quantity?: number;
  images: { url: string; altText?: string | null }[];
  category: { name: string };
  brand: { name: string } | null;
};

const LOW_STOCK = 3;

// Color coding is functional here, not decorative - it's the same
// distinction a yard makes tagging a physical part, surfaced consistently
// everywhere a condition shows up (cards, product page, admin tables).
const CONDITION_CLASS: Record<string, string> = {
  NEW: "tag-new",
  USED: "tag-used",
  RECONDITIONED: "tag-reconditioned",
};

export function ConditionTag({ condition }: { condition: string }) {
  const t = useTranslations("Condition");
  const known = condition in CONDITION_CLASS;
  return (
    <span className={CONDITION_CLASS[condition] ?? "tag-condition bg-steel/15 text-steel"}>
      {known ? t(condition as "NEW") : condition}
    </span>
  );
}

// Stock as a shopper needs it: "out of stock" must be unmissable (the part
// stays listed so it can still be found and requested), low stock nudges.
export function StockBadge({ quantity }: { quantity: number | undefined }) {
  const t = useTranslations("Catalog");
  if (quantity === undefined) return null;
  if (quantity <= 0) return <span className="tag-condition bg-red-100 text-red-700">{t("outOfStock")}</span>;
  if (quantity <= LOW_STOCK) return <span className="text-xs font-medium text-amber-dark">{t("lowStock", { count: quantity })}</span>;
  return null;
}

export function ProductCard({ product, eager = false }: { product: ProductCardData; eager?: boolean }) {
  const t = useTranslations("Catalog");
  const soldOut = product.quantity !== undefined && product.quantity <= 0;
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="relative block bg-white border border-steel-light transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:z-10 hover:border-ink hover:shadow-lg"
    >
      <div className="relative w-full aspect-square overflow-hidden bg-steel-light">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading={eager ? "eager" : "lazy"}
            unoptimized={isUnoptimizableImage(image.url)}
            className={`object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          // Same footprint as a photo, so cards line up and nothing shifts.
          <div className="absolute inset-0 flex items-center justify-center text-steel" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M4 18l5-5 3 3 3-3 5 5" />
            </svg>
          </div>
        )}
        {soldOut && (
          <span className="absolute top-2 left-2 bg-ink text-paper text-xs font-semibold px-2 py-1">{t("outOfStock")}</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-steel">
          {product.brand?.name ?? t("unbranded")} / {product.category.name}
        </p>
        <h2 className="font-sans font-bold mt-1 text-sm text-ink leading-snug">{product.name}</h2>
        <div className="flex items-center justify-between flex-wrap gap-x-2 gap-y-1 mt-2">
          <p className="font-mono font-semibold text-ink">{formatMoney(product.price)}</p>
          <ConditionTag condition={product.condition} />
        </div>
        {!soldOut && <div className="mt-1"><StockBadge quantity={product.quantity} /></div>}
      </div>
    </Link>
  );
}
