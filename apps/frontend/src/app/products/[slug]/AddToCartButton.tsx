"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!user) {
      router.push("/login");
      return;
    }
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

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={!inStock || status === "adding"}
        className="w-full bg-gray-900 text-white rounded py-3 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {!inStock ? "Out of stock" : status === "adding" ? "Adding…" : status === "added" ? "Added ✓" : "Add to cart"}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}