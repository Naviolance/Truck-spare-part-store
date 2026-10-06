import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { categoryName } from "@/lib/catalog";
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
  category: { name: string; nameFr?: string | null };
  brand: { name: string } | null;
  partNumber?: string | null;
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
// stays listed so it can still be found and requested), low stock nudges,
// and plain availability is reassuring enough to show too.
export function StockBadge({ quantity }: { quantity: number | undefined }) {
  const t = useTranslations("Catalog");
  if (quantity === undefined) return null;
  const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
  if (quantity <= 0) return <span className={`${pill} bg-rust/15 text-rust-dark`}>{t("outOfStock")}</span>;
  if (quantity <= LOW_STOCK) return <span className={`${pill} bg-amber/20 text-amber-dark`}>{t("lowStock", { count: quantity })}</span>;
  return <span className={`${pill} bg-stock-bg text-stock`}>{t("inStock")}</span>;
}

export function ProductCard({ product, eager = false }: { product: ProductCardData; eager?: boolean }) {
  const t = useTranslations("Catalog");
  const locale = useLocale();
  const soldOut = product.quantity !== undefined && product.quantity <= 0;
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-line bg-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink"
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-sand">
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
          <div className="absolute inset-0 flex items-center justify-center text-steel/60" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.8" />
              <path d="M21 16l-5-5-8 8" />
            </svg>
          </div>
        )}
        <span className="absolute top-2.5 left-2.5">
          <ConditionTag condition={product.condition} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
        <h2 className="text-[15px] sm:text-[17px] font-bold leading-snug text-ink">{product.name}</h2>
        <p className="text-sm text-steel">
          {product.brand?.name ?? t("unbranded")} · {categoryName(product.category, locale)}
        </p>
        {product.partNumber && (
          <p className="font-mono text-xs text-steel">
            {t("ref")} {product.partNumber}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2.5">
          <p className="text-lg sm:text-xl font-bold text-ink">{formatMoney(product.price)}</p>
          <StockBadge quantity={product.quantity} />
        </div>
      </div>
    </Link>
  );
}
