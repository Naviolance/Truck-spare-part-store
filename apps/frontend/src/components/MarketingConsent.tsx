"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";

// "Send me offers" on the account page: saved as soon as it's switched.
export function MarketingConsent() {
  const t = useTranslations("Account");
  const [value, setValue] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/users/me").then(async (res) => res.ok && setValue(Boolean((await res.json()).marketingOptIn)));
  }, []);

  async function change(next: boolean) {
    setSaving(true);
    const res = await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ marketingOptIn: next }) });
    if (res.ok) setValue(next);
    setSaving(false);
  }

  if (value === null) return null;
  return (
    <label className="mt-6 flex cursor-pointer items-start gap-3 border-t border-line pt-5">
      <input
        type="checkbox"
        checked={value}
        disabled={saving}
        onChange={(e) => change(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-ink"
      />
      <span>
        <span className="block font-semibold text-ink">{t("marketingTitle")}</span>
        <span className="block text-sm text-steel">{t("marketingBody")}</span>
      </span>
    </label>
  );
}
