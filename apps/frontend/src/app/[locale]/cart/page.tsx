"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";
import { useRequireAuth } from "@/lib/use-require-auth";
import { RelatedProducts } from "./RelatedProducts";

export default function CartPage() {
  const t = useTranslations("Cart");
  const tc = useTranslations("Common");
  const { ready } = useRequireAuth();
  const { items, subtotal, loading, updateQuantity, removeItem } = useCart();
  const router = useRouter();

  if (!ready || loading) return <main className="max-w-3xl mx-auto px-4 py-16 text-steel">{tc("loading")}</main>;

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">{t("emptyTitle")}</h1>
        <p className="text-steel mb-6">{t("emptyBody")}</p>
        <Link href="/products" className="text-ink underline transition-colors duration-200 hover:text-steel">
          {tc("continueShopping")}
        </Link>
      </main>
    );
  }

  const categoryIds = Array.from(new Set(items.map((item) => item.product.categoryId)));
  const excludeProductIds = items.map((item) => item.product.id);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">{t("title")}</h1>

      <div className="max-w-3xl">
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap sm:flex-nowrap items-center gap-4 border border-steel-light rounded-lg p-4 bg-white">
              {item.product.images[0] ? (
                <div className="relative w-20 h-20 shrink-0">
                  <Image
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    fill
                    sizes="80px"
                    unoptimized={isUnoptimizableImage(item.product.images[0].url)}
                    className="object-cover rounded-lg border border-steel-light"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-steel-light rounded-lg flex items-center justify-center text-xs text-steel shrink-0">
                  {tc("noImage")}
                </div>
              )}

              <div className="flex-1 min-w-[140px]">
                <Link href={`/products/${item.product.slug}`} className="font-medium text-ink transition-colors duration-200 hover:text-steel">
                  {item.product.name}
                </Link>
                <p className="text-sm text-steel">{t("each", { price: formatMoney(item.product.price) })}</p>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-4 order-3 sm:order-none">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    aria-label={t("decrease")}
                    className="w-9 h-9 border border-steel-light rounded-lg text-sm transition-colors duration-200 hover:border-steel hover:bg-paper"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm" aria-live="polite">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label={t("increase")}
                    className="w-9 h-9 border border-steel-light rounded-lg text-sm transition-colors duration-200 hover:border-steel hover:bg-paper"
                  >
                    +
                  </button>
                </div>
                <div className="w-24 text-right font-semibold text-ink">{formatMoney(Number(item.product.price) * item.quantity)}</div>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="text-red-600 text-sm transition-colors duration-200 hover:text-red-800 hover:underline order-2 sm:order-none"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-steel-light pt-6 flex items-center justify-between">
          <span className="text-lg font-semibold text-ink">{t("subtotal")}</span>
          <span className="text-lg font-bold text-ink">{formatMoney(subtotal)}</span>
        </div>

        <button
          onClick={() => router.push("/checkout")}
          className="w-full mt-4 bg-amber text-ink py-3 font-medium transition-colors duration-150 hover:bg-amber-dark"
        >
          {t("checkout")}
        </button>
      </div>

      <RelatedProducts categoryIds={categoryIds} excludeProductIds={excludeProductIds} />
    </main>
  );
}
