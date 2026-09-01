"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "./AuthContext";

type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    images: { url: string }[];
  };
};

type CartContextType = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  loading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<{ ok: boolean; error?: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setSubtotal(0);
      return;
    }
    setLoading(true);
    const res = await apiFetch("/cart");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setSubtotal(data.subtotal);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addToCart(productId: string, quantity: number) {
    const res = await apiFetch("/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.message || "Could not add to cart" };
    }
    await refresh();
    return { ok: true };
  }

  async function updateQuantity(itemId: string, quantity: number) {
    await apiFetch(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    await refresh();
  }

  async function removeItem(itemId: string) {
    await apiFetch(`/cart/items/${itemId}`, { method: "DELETE" });
    await refresh();
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, subtotal, itemCount, loading, addToCart, updateQuantity, removeItem, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}