"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { AuthModal } from "@/components/AuthModal";

// `compact`: the phone buy bar's version (shorter, no icon, no full width).
export function AddToCartButton({
  productId,
  slug,
  inStock,
  compact = false,
}: {
  productId: string;
  slug: string;
  inStock: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("Product");
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  async function doAdd() {
    setStatus("adding");
    setError(null);
    const result = await addToCart(productId, 1);
    if (!result.ok) {
      setError(result.error || t("genericError"));
      setStatus("idle");
      return;
    }
    track("add_to_cart", { product: slug });
    setStatus("added");
    setTimeout(() => setStatus("idle"), 1500);
  }

  function handleClick() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    doAdd();
  }

  return (
    <div className={compact ? "" : "w-full"}>
      <button
        onClick={handleClick}
        disabled={!inStock || status === "adding"}
        className={`flex items-center justify-center gap-2.5 rounded-[10px] bg-amber font-bold text-ink transition-colors duration-150 hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-40 ${
          compact ? "h-[50px] whitespace-nowrap px-4 text-base" : "h-[52px] w-full text-[17px]"
        }`}
      >
        {status === "adding" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" />
        ) : (
          !compact && <CartIcon />
        )}
        {!inStock ? t("outOfStock") : status === "adding" ? t("adding") : status === "added" ? t("added") : t("addToCart")}
      </button>
      {error && <p role="alert" className="text-red-600 text-sm mt-2">{error}</p>}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={doAdd}
        message={t("loginToAdd")}
      />
    </div>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2l2.4 11h11l2-8H6.2" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
  );
}
