"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, subtotal, loading, updateQuantity, removeItem } = useCart();

  if (loading) return <main className="max-w-3xl mx-auto px-4 py-16 text-gray-500">Loading cart…</main>;

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Browse our products to find what you need.</p>
        <Link href="/" className="text-gray-900 underline">Continue shopping</Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Your cart</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white">
            {item.product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.product.images[0].url}
                alt={item.product.name}
                className="w-20 h-20 object-cover rounded border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                No image
              </div>
            )}

            <div className="flex-1">
              <Link href={`/products/${item.product.slug}`} className="font-medium hover:underline">
                {item.product.name}
              </Link>
              <p className="text-sm text-gray-500">${item.product.price} each</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-7 h-7 border border-gray-300 rounded text-sm"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-7 h-7 border border-gray-300 rounded text-sm"
              >
                +
              </button>
            </div>

            <div className="w-20 text-right font-medium">
              ${(Number(item.product.price) * item.quantity).toFixed(2)}
            </div>

            <button
              onClick={() => removeItem(item.id)}
              className="text-red-600 text-sm hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6 flex items-center justify-between">
        <span className="text-lg font-semibold">Subtotal</span>
        <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
      </div>

      <button className="w-full mt-4 bg-gray-900 text-white rounded py-3 font-medium">
        Checkout
      </button>
      <p className="text-xs text-gray-400 mt-2 text-center">Checkout coming next</p>
    </main>
  );
}