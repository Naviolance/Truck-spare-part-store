"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { authInputClass } from "@/components/auth/AuthForms";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const id = useId();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Same answer whether or not the account exists (the backend never says),
    // so this page can't be used to discover who has an account.
    await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
      skipAuth: true,
    }).catch(() => null);
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      {submitted ? (
        <>
          <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-4">{t("checkEmailTitle")}</h1>
          <p className="text-steel text-sm" role="status">{t("checkEmailBody", { email })}</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">{t("forgotTitle")}</h1>
          <p className="text-sm text-steel mb-6">{t("forgotBody")}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={`${id}-email`} className="block text-sm font-medium mb-1 text-steel">{t("email")}</label>
              <input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber text-ink py-2.5 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
            >
              {submitting ? t("sending") : t("forgotButton")}
            </button>
          </form>
        </>
      )}
      <p className="text-sm text-steel mt-4">
        <Link href="/login" className="underline transition-colors duration-200 hover:text-ink">{t("backToLogin")}</Link>
      </p>
    </main>
  );
}
