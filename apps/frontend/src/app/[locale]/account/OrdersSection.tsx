"use client";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { trackerStep, useOrderStatusLabel } from "@/lib/order-status";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { whatsappLink } from "@/lib/site";

export type AccountOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  items: { quantity: number }[];
  payments: { provider: string; status: string }[];
};

// Status pill colours: done = green, in progress = amber, ended without a
// sale = grey.
function pillClass(status: string): string {
  if (status === "DELIVERED") return "bg-stock-bg text-stock";
  if (trackerStep(status) !== undefined) return "bg-[#F6E6C8] text-amber-dark";
  return "bg-[#E1E4E7] text-steel";
}

// "Mes commandes" in the account hub (redesign step 5, option B): orders
// still on their way get a card with a 4-step progress bar (the same steps
// as the order page's tracker); the rest are a compact list.
export function OrdersSection({ orders }: { orders: AccountOrder[] }) {
  const t = useTranslations("Account");
  const to = useTranslations("Orders");
  const locale = useLocale();
  const statusLabel = useOrderStatusLabel();
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const count = (o: AccountOrder) => o.items.reduce((n, i) => n + i.quantity, 0);

  const active = orders.filter((o) => (trackerStep(o.status) ?? 4) < 4);
  const past = orders.filter((o) => !active.includes(o));
  const steps = [to("stepReceived"), to("stepConfirm"), to("stepReady"), to("stepCollected")];

  if (orders.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-line bg-card p-6 text-center">
        <p className="mb-4 text-steel">{to("empty")}</p>
        <Link href="/products" className="btn-primary">{to("browse")}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {active.map((o) => {
        const current = trackerStep(o.status)!;
        return (
          <section key={o.id} aria-label={t("currentOrder")} className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold text-ink">{t("currentOrder")}</h2>
              <span className="font-mono text-sm text-steel">{o.orderNumber} · {formatMoney(o.total)}</span>
            </div>
            <ol aria-label={to("trackerLabel")} className="grid grid-cols-4 gap-2">
              {steps.map((label, i) => (
                <li key={label} className="flex flex-col gap-1.5" aria-current={i === current ? "step" : undefined}>
                  <span className={`h-1.5 rounded-full ${i < current ? "bg-stock" : i === current ? "bg-amber" : "bg-line"}`} />
                  <span className={`text-sm leading-tight ${i <= current ? "font-bold text-ink" : "text-steel"}`}>{label}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2.5">
              <Link href={`/orders/${o.id}`} className="btn-secondary h-12 text-base">{t("viewOrder")}</Link>
              <WhatsAppButton
                href={whatsappLink(to("whatsappMessage", { number: o.orderNumber }))}
                label={t("question")}
                source="account"
                variant="action"
                className="h-12 px-4 text-base"
              />
            </div>
          </section>
        );
      })}

      {past.length > 0 && (
        <section aria-labelledby="past-orders" className="flex flex-col gap-2.5">
          <h2 id="past-orders" className="font-display text-xl font-bold text-ink">{active.length ? t("previousOrders") : to("title")}</h2>
          <ul className="divide-y divide-sand rounded-[14px] border border-line bg-card px-4 sm:px-5">
            {past.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3.5 hover:text-amber-dark">
                  <span className="flex-1 basis-56 font-bold text-ink">
                    {date(o.createdAt)} · {t("itemCount", { count: count(o) })}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${pillClass(o.status)}`}>{statusLabel(o)}</span>
                  <span className="w-28 text-right font-bold text-ink">{formatMoney(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
