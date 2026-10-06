"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, readError } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";

const inputClass = "w-full border border-steel-light rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-steel";
const labelClass = "block text-sm font-medium mb-1 text-steel";

// Used on the customer account page and the admin account page. The backend
// (POST /auth/change-password) checks the current password and signs out
// every other device.
export function ChangePasswordForm() {
  const t = useTranslations("Account");
  const ta = useTranslations("Auth");
  const id = useId();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setDone(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.next !== form.confirm) return setError(t("passwordsDontMatch"));
    setSubmitting(true);
    const res = await apiFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    });
    setSubmitting(false);
    if (!res.ok) return setError(await readError(res, ta("genericError")));
    setForm({ current: "", next: "", confirm: "" });
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-lg font-display font-bold text-ink">{t("passwordTitle")}</h2>
      <div>
        <label htmlFor={`${id}-current`} className={labelClass}>{t("currentPassword")}</label>
        <PasswordInput id={`${id}-current`} autoComplete="current-password" required value={form.current} onChange={set("current")} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-new`} className={labelClass}>{t("newPassword")}</label>
        <PasswordInput
          id={`${id}-new`}
          autoComplete="new-password"
          required
          minLength={10}
          aria-describedby={`${id}-hint`}
          value={form.next}
          onChange={set("next")}
          className={inputClass}
        />
        <p id={`${id}-hint`} className="text-xs text-steel mt-1">{ta("passwordHint")}</p>
      </div>
      <div>
        <label htmlFor={`${id}-confirm`} className={labelClass}>{t("confirmPassword")}</label>
        <PasswordInput id={`${id}-confirm`} autoComplete="new-password" required value={form.confirm} onChange={set("confirm")} className={inputClass} />
      </div>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {done && <p role="status" className="text-emerald-700 text-sm">{t("passwordChanged")}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-ink text-paper px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-ink/90 disabled:opacity-50"
      >
        {submitting ? ta("saving") : t("changePassword")}
      </button>
    </form>
  );
}
