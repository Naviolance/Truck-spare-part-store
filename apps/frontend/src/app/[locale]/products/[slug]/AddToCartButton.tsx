"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { AuthModal } from "@/components/AuthModal";

export function AddToCartButton({ productId, slug, inStock }: { productId: string; slug: string; inStock: boolean }) {
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
    <div>
      <button
        onClick={handleClick}
        disabled={!inStock || status === "adding"}
        className="w-full bg-amber text-ink py-3 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm flex items-center justify-center gap-2"
      >
        {status === "adding" && (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
