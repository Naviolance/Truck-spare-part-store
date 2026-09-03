"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { AuthModal } from "@/components/AuthModal";

export function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
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
      setError(result.error || "Something went wrong");
      setStatus("idle");
      return;
    }
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
        className="w-full rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white py-3 font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm"
      >
        {!inStock ? "Out of stock" : status === "adding" ? "Adding…" : status === "added" ? "Added ✓" : "Add to cart"}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={doAdd}
        message="Log in or create an account to add this to your cart."
      />
    </div>
  );
}
