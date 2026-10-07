"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PayOrderPanel } from "./PayOrderPanel";
import { OrderTracker, hasTracker } from "./OrderTracker";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
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

  // Unpaid with nothing in progress (or confirmation gave up): offer to pay/retry.
  const needsPayment = order.status === "PAYMENT_PENDING" && !isAwaitingCash(order) && (!hasPendingOnline || pollTimedOut);
  const lastAttemptFailed = order.payments.length > 0 && order.payments.every((p) => p.status === "FAILED");
  const number = order.orderNumber;

  const placed = new Date(order.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const box = "rounded-[14px] p-4";

  // Redesign step 5, option B: the tracker says where the order is; the
  // messages below it only cover what the tracker can't (paying, waiting
  // for the payment provider, expired, failed).
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-4">
      <Link href="/orders" className="text-sm text-steel hover:text-ink">← {t("title")}</Link>
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">{t("yourOrder")}</h1>
        <p className="font-mono text-sm text-steel">{number} · {placed}</p>
      </div>

      <OrderTracker order={order} />

      {needsPayment && (
        <PayOrderPanel orderId={order.id} total={order.total} lastAttemptFailed={lastAttemptFailed} onPaid={load} />
      )}

      {awaitingConfirmation && !needsPayment && (
        <div role="status" className={`${box} flex items-center gap-3 border border-line bg-card`}>
          {!pollTimedOut && <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" />}
          <div>
            <p className="font-semibold text-ink">{pollTimedOut ? t("stillConfirming") : t("confirming")}</p>
            <p className="text-sm text-steel">{pollTimedOut ? t("stillConfirmingBody") : t("confirmingBody")}</p>
          </div>
        </div>
      )}

      {order.status === "EXPIRED" && (
        <div className={`${box} border border-line bg-card`}>
          <p className="font-semibold text-ink">{t("expiredTitle")}</p>
          <p className="text-sm text-steel">
            {t("expiredBody")} <Link href="/products" className="underline">{t("browse")}</Link>
          </p>
        </div>
      )}

      {order.status === "PAYMENT_FAILED" && (
        <div className={`${box} bg-[#F1DCD5]`}>
          <p className="font-semibold text-[#7A2F1B]">{t("failedTitle")}</p>
          <p className="text-sm text-[#7A2F1B]">
            {t("failedBody")} <Link href="/products" className="underline">{t("browse")}</Link>
          </p>
        </div>
      )}

      <section aria-label={t("details")} className="rounded-[14px] border border-line bg-card px-4">
        <ul className="divide-y divide-sand">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-3 text-ink">
              <span>{item.productName} × {item.quantity}</span>
              <span className="shrink-0 font-semibold">{formatMoney(Number(item.unitPrice) * item.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between py-3 text-lg font-bold text-ink">
            <span>{t("total")}</span>
            <span>{formatMoney(order.total)}</span>
          </li>
        </ul>
      </section>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-steel">{t("status")}</dt>
        <dd className="text-ink">{statusLabel(order)}</dd>
        <dt className="text-steel">{t("contactAddress")}</dt>
        <dd className="text-ink">{[order.shippingAddress, order.shippingCity].filter(Boolean).join(", ")}</dd>
        <dt className="text-steel">{t("phone")}</dt>
        <dd className="text-ink">{order.shippingPhone}</dd>
      </dl>

      <WhatsAppButton
        href={whatsappLink(t("whatsappMessage", { number }))}
        label={t("questionWhatsapp")}
        source="order"
        className="h-[52px] rounded-[10px] text-base"
      />
      {hasTracker(order.status) && <p className="text-sm text-steel">{t("pickupNote")}</p>}

      <Link href="/products" className="text-sm text-ink underline underline-offset-2 hover:text-steel">
        {tc("continueShopping")}
      </Link>
    </main>
  );
}
