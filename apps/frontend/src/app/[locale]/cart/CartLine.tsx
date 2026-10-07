"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";

type Item = {
  id: string;
  quantity: number;
  product: { name: string; slug: string; price: string; images: { url: string }[] };
};

const stepButton =
  "flex h-11 w-11 items-center justify-center bg-card text-xl text-ink transition-colors hover:bg-sand disabled:opacity-40";

export function CartLine({
  item,
  onQuantity,
  onRemove,
}: {
  item: Item;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Cart");
  const tc = useTranslations("Common");
  const image = item.product.images[0]?.url;

  return (
    <li className="flex flex-wrap items-center gap-3.5 py-3.5 sm:flex-nowrap">
      {image ? (
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[10px] bg-sand">
          <Image src={image} alt={item.product.name} fill sizes="72px" unoptimized={isUnoptimizableImage(image)} className="object-cover" />
        </div>
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[10px] bg-sand text-xs text-steel">{tc("noImage")}</div>
      )}

      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
        <Link href={`/products/${item.product.slug}`} className="text-[17px] font-bold text-ink hover:underline underline-offset-2">
          {item.product.name}
        </Link>
        <span className="text-sm text-steel">{t("each", { price: formatMoney(item.product.price) })}</span>
        <button type="button" onClick={onRemove} className="self-start py-0.5 text-sm text-[#8A3821] underline underline-offset-2 hover:text-ink">
          {t("remove")}
        </button>
      </div>

      <div className="ml-auto flex items-center gap-3.5">
        <div role="group" aria-label={t("quantity")} className="flex items-center overflow-hidden rounded-[10px] border border-[#BDB5A6]">
          <button type="button" onClick={() => onQuantity(item.quantity - 1)} disabled={item.quantity <= 1} aria-label={t("decrease")} className={stepButton}>
            −
          </button>
          <span className="min-w-8 text-center text-[17px] font-bold" aria-live="polite">{item.quantity}</span>
          <button type="button" onClick={() => onQuantity(item.quantity + 1)} aria-label={t("increase")} className={stepButton}>
            +
          </button>
        </div>
        <span className="w-28 text-right text-lg font-bold text-ink">{formatMoney(Number(item.product.price) * item.quantity)}</span>
      </div>
    </li>
  );
}
