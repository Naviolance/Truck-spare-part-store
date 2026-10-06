"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, readError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/lib/analytics";
import { whatsappLink } from "@/lib/site";

const inputClass =
  "w-full border border-steel-light rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-steel bg-white";
const labelClass = "block text-xs font-medium mb-1 text-steel";

// The "can't find it? tell us" lead form — shown wherever a search comes up
// short, on out-of-stock products and in Find My Part. Open to guests: an
// account would only add friction to the moment a customer is most likely
// to give up. The phone number is required (it's how the store follows up),
// and the form says so and why.
export function RequestProductForm({
  prefillDescription = "",
  prefillVehicle = "",
  startOpen = false,
}: {
  prefillDescription?: string;
  prefillVehicle?: string;
  startOpen?: boolean;
}) {
  const t = useTranslations("RequestPart");
  const { user } = useAuth();
  const id = useId();
  const [open, setOpen] = useState(startOpen);
  const [form, setForm] = useState({
    description: prefillDescription,
    partNumber: "",
    vehicleInfo: prefillVehicle,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactViaWhatsApp: true,
    website: "", // honeypot — hidden from people, filled by bots
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const whatsapp = whatsappLink(t("whatsappMessage", { part: form.description || "…" }));

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  if (done) {
    return (
      <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-left">
        <p className="font-semibold text-emerald-800">{t("doneTitle")}</p>
        <p className="text-sm text-emerald-700">{t("doneBody", { phone: form.contactPhone })}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="text-sm text-steel">
        {t("teaser")}{" "}
        <button onClick={() => setOpen(true)} className="font-medium text-ink underline underline-offset-2 hover:text-amber-dark">
          {t("open")}
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.description.trim().length < 10) return setError(t("tooShort"));
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/product-requests", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        partNumber: form.partNumber || undefined,
        vehicleInfo: form.vehicleInfo || undefined,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined,
        website: form.website || undefined,
      }),
    }).catch(() => null);
    setSubmitting(false);
    if (!res || !res.ok) return setError(res ? await readError(res, t("error")) : t("error"));
    track("part_request_submitted");
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="text-left space-y-3 max-w-lg mx-auto" aria-labelledby={`${id}-title`}>
      <div>
        <p id={`${id}-title`} className="font-display font-bold text-lg text-ink">{t("title")}</p>
        <p className="text-sm text-steel">{t("intro")}</p>
      </div>

      <div>
        <label htmlFor={`${id}-desc`} className={labelClass}>{t("description")} *</label>
        <textarea id={`${id}-desc`} required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={set("description")} placeholder={t("descriptionPlaceholder")} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-pn`} className={labelClass}>{t("partNumber")}</label>
          <input id={`${id}-pn`} maxLength={64} value={form.partNumber} onChange={set("partNumber")} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor={`${id}-veh`} className={labelClass}>{t("vehicle")}</label>
          <input id={`${id}-veh`} maxLength={200} value={form.vehicleInfo} onChange={set("vehicleInfo")} placeholder={t("vehiclePlaceholder")} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!user && (
          <div>
            <label htmlFor={`${id}-name`} className={labelClass}>{t("name")} *</label>
            <input id={`${id}-name`} required autoComplete="name" maxLength={100} value={form.contactName} onChange={set("contactName")} className={inputClass} />
          </div>
        )}
        <div>
          <label htmlFor={`${id}-phone`} className={labelClass}>{t("phone")} *</label>
          <input
            id={`${id}-phone`}
            required
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            value={form.contactPhone}
            onChange={set("contactPhone")}
            placeholder={t("phonePlaceholder")}
            aria-describedby={`${id}-phone-why`}
            className={inputClass}
          />
        </div>
      </div>
      <p id={`${id}-phone-why`} className="text-xs text-steel -mt-1">{t("phoneWhy")}</p>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.contactViaWhatsApp} onChange={set("contactViaWhatsApp")} />
        {t("whatsapp")}
      </label>

      {!user && (
        <div>
          <label htmlFor={`${id}-email`} className={labelClass}>{t("email")}</label>
          <input id={`${id}-email`} type="email" autoComplete="email" value={form.contactEmail} onChange={set("contactEmail")} className={inputClass} />
        </div>
      )}

      {/* Honeypot: off-screen and skipped by keyboard/screen readers, so only bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="w-full bg-amber text-ink py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50">
        {submitting ? t("sending") : t("submit")}
      </button>

      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp_click", { from: "request_form" })}
          className="block text-center text-sm text-emerald-700 underline underline-offset-2"
        >
          {t("orWhatsapp")}
        </a>
      )}
    </form>
  );
}
