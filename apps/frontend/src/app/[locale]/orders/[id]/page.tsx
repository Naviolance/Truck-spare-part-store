"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PayOrderPanel } from "./PayOrderPanel";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useRequireAuth } from "@/lib/use-require-auth";
import { isAwaitingCash, useOrderStatusLabel } from "@/lib/order-status";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { whatsappLink } from "@/lib/site";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  total: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
  createdAt: string;
  items: { id: string; productName: string; unitPrice: string; quantity: number }[];
  payments: { provider: string; status: string }[];
};

export default function OrderDetailPage() {
  const t = useTranslations("Orders");
  const tc = useTranslations("Common");
  const statusLabel = useOrderStatusLabel();
  const { ready } = useRequireAuth();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  // The backend's own reconciliation call to the payment provider
  // can occasionally run long enough that a proxy or platform in front of it
  // cuts the connection — which makes this fetch *reject* rather than just
  // resolve slowly. Without a .catch(), that left the page stuck on
  // "Loading…" forever with no way to recover except a manual refresh.
  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    apiFetch(`/orders/${id}`)
      .then(async (res) => {
        if (res.ok) setOrder(await res.json());
        else setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // An online attempt (any provider) still waiting for its result.
  const hasPendingOnline =
    order?.payments.some((p) => p.provider !== "cash" && p.status === "PENDING") ?? false;
  const awaitingConfirmation = order?.status === "PAYMENT_PENDING" && hasPendingOnline;

  // The payment provider confirms payment via an async webhook that can land a few
  // seconds after the browser is redirected back here — so a customer who
  // just paid may briefly still see PAYMENT_PENDING. Poll until the webhook
  // catches up (or give up after a minute rather than polling forever).
  useEffect(() => {
    if (!awaitingConfirmation || pollTimedOut) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await apiFetch(`/orders/${id}`);
        if (res.ok) setOrder(await res.json());
      } catch {
        // Network hiccup — just try again on the next tick.
      }
      if (attempts >= 20) {
        clearInterval(interval);
        setPollTimedOut(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [awaitingConfirmation, pollTimedOut, id]);

  if (!ready || loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-steel">{tc("loading")}</main>;
  if (loadError) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-steel mb-4">{t("loadError")}</p>
        <button onClick={load} className="border border-steel-light rounded-lg px-4 py-2 text-sm transition-colors duration-200 hover:border-steel hover:bg-paper">
          {tc("tryAgain")}
        </button>
      </main>
    );
  }
  if (!order) return <main className="max-w-2xl mx-auto px-4 py-16 text-steel">{t("notFound")}</main>;

  const pendingCash = isAwaitingCash(order);
  // Unpaid with nothing in progress (or confirmation gave up): offer to pay/retry.
  const needsPayment = order.status === "PAYMENT_PENDING" && !pendingCash && (!hasPendingOnline || pollTimedOut);
  const lastAttemptFailed = order.payments.length > 0 && order.payments.every((p) => p.status === "FAILED");
  const number = order.orderNumber;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {(pendingCash || order.status === "PAID") && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-emerald-800">{order.status === "PAID" ? t("confirmed") : t("placed")}</p>
          <p className="text-sm text-emerald-700">
            {t("orderNumber", { number })} — {t("placedBody", { phone: order.shippingPhone })}
          </p>
        </div>
      )}

      {needsPayment && (
        <PayOrderPanel orderId={order.id} total={order.total} lastAttemptFailed={lastAttemptFailed} onPaid={load} />
      )}

      {order.status === "EXPIRED" && (
        <div className="bg-paper border border-steel-light rounded-lg p-4 mb-6">
          <p className="font-semibold text-ink">{t("expiredTitle")}</p>
          <p className="text-sm text-steel">
            {t("expiredBody")}{" "}
            <Link href="/products" className="underline">{t("browse")}</Link>
          </p>
        </div>
      )}

      {awaitingConfirmation && !needsPayment && (
        <div role="status" className="bg-paper border border-steel-light rounded-lg p-4 mb-6 flex items-center gap-3">
          {!pollTimedOut && <div className="w-5 h-5 border-2 border-steel-light border-t-ink rounded-full animate-spin shrink-0" />}
          <div>
            <p className="font-semibold text-ink">{pollTimedOut ? t("stillConfirming") : t("confirming")}</p>
            <p className="text-sm text-steel">
              {t("orderNumber", { number })} — {pollTimedOut ? t("stillConfirmingBody") : t("confirmingBody")}
            </p>
          </div>
        </div>
      )}

      {order.status === "PAYMENT_FAILED" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-red-800">{t("failedTitle")}</p>
          <p className="text-sm text-red-700">
            {t("orderNumber", { number })} — {t("failedBody")}{" "}
            <Link href="/products" className="underline">{t("browse")}</Link>
          </p>
        </div>
      )}

      <h1 className="text-xl font-display font-bold text-ink tracking-tight mb-4">{t("details")}</h1>

      <div className="border border-steel-light rounded-lg divide-y divide-steel-light mb-6 bg-white">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 p-3 text-sm text-steel">
            <span>{item.productName} × {item.quantity}</span>
            <span className="shrink-0">{formatMoney(Number(item.unitPrice) * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 font-semibold text-ink">
          <span>{t("total")}</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      {pendingCash && (
        <div className="bg-amber/10 border-l-4 border-amber p-4 mb-6 text-sm text-ink">
          {t("cashNote", { total: formatMoney(order.total) })}
        </div>
      )}

      <dl className="text-sm text-steel grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mb-6">
        <dt className="font-medium">{t("status")}</dt>
        <dd className="text-ink">{statusLabel(order)}</dd>
        <dt className="font-medium">{t("numberLabel")}</dt>
        <dd className="text-ink font-mono">{number}</dd>
        <dt className="font-medium">{t("contactAddress")}</dt>
        <dd className="text-ink">{order.shippingAddress}, {order.shippingCity}</dd>
        <dt className="font-medium">{t("phone")}</dt>
        <dd className="text-ink">{order.shippingPhone}</dd>
      </dl>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-steel-light pt-6">
        <p className="text-sm text-steel">{t("questions")}</p>
        <WhatsAppButton href={whatsappLink(t("whatsappMessage", { number }))} label="WhatsApp" source="order" variant="outline" />
      </div>

      <Link href="/products" className="inline-block mt-6 text-ink underline text-sm transition-colors duration-200 hover:text-steel">
        {tc("continueShopping")}
      </Link>
    </main>
  );
}
