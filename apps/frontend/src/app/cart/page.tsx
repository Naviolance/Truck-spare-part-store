"use client";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";

export default function CartPage() {
  const { items, subtotal, loading, updateQuantity, removeItem } = useCart();
  const router = useRouter();

  if (loading) return <main className="max-w-3xl mx-auto px-4 py-16 text-zinc-500">Loading cart…</main>;

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">Your cart is empty</h1>
        <p className="text-zinc-500 mb-6">Browse our products to find what you need.</p>
        <Link href="/products" className="text-zinc-900 underline transition-colors duration-200 hover:text-zinc-600">
          Continue shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Your cart</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap sm:flex-nowrap items-center gap-4 border border-zinc-200 rounded-lg p-4 bg-white transition-shadow duration-200 hover:shadow-sm">
            {item.product.images[0] ? (
              <div className="relative w-20 h-20 shrink-0">
                <Image
                  src={item.product.images[0].url}
                  alt={item.product.name}
                  fill
                  sizes="80px"
                  unoptimized={isUnoptimizableImage(item.product.images[0].url)}
                  className="object-cover rounded-lg border border-zinc-200"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-400 shrink-0">
                No image
              </div>
            )}

            <div className="flex-1 min-w-[140px]">
              <Link href={`/products/${item.product.slug}`} className="font-medium text-zinc-900 transition-colors duration-200 hover:text-zinc-600">
                {item.product.name}
              </Link>
              <p className="text-sm text-zinc-500">{formatMoney(item.product.price)} each</p>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-4 order-3 sm:order-none">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="w-7 h-7 border border-zinc-300 rounded-lg text-sm transition-colors duration-200 hover:border-zinc-400 hover:bg-zinc-50"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 border border-zinc-300 rounded-lg text-sm transition-colors duration-200 hover:border-zinc-400 hover:bg-zinc-50"
                >
                  +
                </button>
              </div>

              <div className="w-20 text-right font-semibold text-zinc-900">
                {formatMoney(Number(item.product.price) * item.quantity)}
              </div>
            </div>

            <button
              onClick={() => removeItem(item.id)}
              className="text-red-600 text-sm transition-colors duration-200 hover:text-red-800 hover:underline order-2 sm:order-none"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-6 flex items-center justify-between">
        <span className="text-lg font-semibold text-zinc-900">Subtotal</span>
        <span className="text-lg font-bold text-zinc-900">{formatMoney(subtotal)}</span>
      </div>

      <button
        onClick={() => router.push("/checkout")}
        className="w-full mt-4 rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white py-3 font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md"
      >
        Checkout
      </button>
    </main>
  );
}
