"use client";
import { useLocale, useTranslations } from "next-intl";
import { formatMoney } from "@/lib/money";
import { isAwaitingCash } from "@/lib/order-status";

type Order = {
  status: string;
  total: string;
  shippingPhone: string;
  createdAt: string;
  payments: { provider: string; status: string }[];
};

// Where an order is on the normal path (received → confirmed → ready →
// collected), as the index of the step in progress; 4 = all done. Orders
// off that path (expired, failed, cancelled, refunded, disputed) get no
// tracker — the order page explains those with its own message.
const STEP: Record<string, number> = { PAYMENT_PENDING: 1, PAID: 2, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4 };

export function hasTracker(status: string): boolean {
  return status in STEP;
}

// The order page's progress tracker (redesign step 5, option B). Cash
// orders: the system marks them paid at the counter, so "pay at pickup"
// rides on the last step instead of a separate "paid" step.
export function OrderTracker({ order }: { order: Order }) {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const current = STEP[order.status];
  if (current === undefined) return null;

  const cash = isAwaitingCash(order);
  const paidOnline = order.payments.some((p) => p.provider !== "cash" && p.status === "SUCCEEDED");
  const placedAt = new Date(order.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const steps: { title: string; detail?: string }[] = [
    { title: t("stepReceived"), detail: placedAt },
    {
      title: current > 1 ? t("stepConfirmed") : t("stepConfirm"),
      detail: current === 1 ? (cash ? t("stepConfirmCash", { phone: order.shippingPhone }) : t("stepAwaitingPayment")) : paidOnline ? t("stepPaidOnline") : undefined,
    },
    { title: t("stepReady"), detail: current === 2 ? t("stepPreparing") : undefined },
    {
      title: t("stepCollected"),
      detail: [current === 3 ? t("stepWaiting") : "", cash ? t("stepPayAtPickup", { total: formatMoney(order.total) }) : ""]
        .filter(Boolean)
        .join(" ") || undefined,
    },
  ];

  return (
    <section aria-label={t("trackerLabel")} className="rounded-[14px] bg-ink p-5 text-paper">
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={step.title} className="flex gap-3" aria-current={now ? "step" : undefined}>
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
                    done ? "bg-stock text-white" : now ? "border-4 border-[#4A3A1F] bg-amber" : "border-2 border-[#4A4540]"
                  }`}
                >
                  {done && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l4 4 10-10" />
                    </svg>
                  )}
                </span>
                {i < steps.length - 1 && <span className={`w-0.5 flex-1 min-h-5 ${done ? "bg-stock" : "bg-[#4A4540]"}`} />}
              </div>
              <div className={i < steps.length - 1 ? "pb-4" : ""}>
                <p className={`font-bold ${now ? "text-amber" : done ? "text-paper" : "font-normal text-paper-dim"}`}>
                  {step.title}
                  <span className="sr-only"> — {done ? t("stepDoneSr") : now ? t("stepNowSr") : t("stepLaterSr")}</span>
                </p>
                {step.detail && <p className="text-sm text-paper-dim">{step.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
