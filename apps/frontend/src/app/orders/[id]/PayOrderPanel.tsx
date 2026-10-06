"use client";
import { useState } from "react";
import { payOrder, usePaymentOptions } from "@/lib/payment";
import { formatMoney } from "@/lib/money";

// Shown on an unpaid order that has no payment in progress: the first
// payment start failed, an online attempt failed or was abandoned, or the
// customer hasn't chosen yet. The order (and its reserved stock) is kept
// until the backend's expiry job releases it, so this is where they retry.
export function PayOrderPanel({
  orderId,
  total,
  lastAttemptFailed,
  onPaid,
}: {
  orderId: string;
  total: string;
  lastAttemptFailed: boolean;
  onPaid: () => void;
}) {
  const options = usePaymentOptions();
  const [busy, setBusy] = useState<"online" | "cash" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(method: "online" | "cash") {
    setBusy(method);
    setError(null);
    const result = await payOrder(orderId, method);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    if (method === "cash") {
      setBusy(null);
      onPaid();
    }
    // online: the browser is navigating to the provider — keep the spinner.
  }

  return (
    <div className="bg-amber/10 border border-amber rounded-lg p-4 mb-6">
      <p className="font-semibold text-ink">
        {lastAttemptFailed ? "Your payment didn't go through" : "Complete your order"}
      </p>
      <p className="text-sm text-steel mt-1">
        Your items are reserved for a limited time. Choose how you&apos;d like to pay {formatMoney(total)}.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        {options?.online && (
          <button
            onClick={() => pay("online")}
            disabled={busy !== null}
            className="bg-amber text-ink px-4 py-2 text-sm font-semibold transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
          >
            {busy === "online" ? "Redirecting…" : lastAttemptFailed ? "Try paying again" : "Pay online"}
          </button>
        )}
        <button
          onClick={() => pay("cash")}
          disabled={busy !== null || !options}
          className="border border-steel-light bg-white px-4 py-2 text-sm font-medium transition-colors duration-150 hover:border-steel disabled:opacity-50"
        >
          {busy === "cash" ? "Saving…" : "Pay cash at pickup"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
