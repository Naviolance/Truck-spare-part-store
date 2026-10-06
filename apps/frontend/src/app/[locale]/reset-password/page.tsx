"use client";
import { Suspense, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch, readApiError } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { authInputClass } from "@/components/auth/AuthForms";
import { useApiError } from "@/lib/use-api-error";

function ResetPasswordInner() {
  const t = useTranslations("Auth");
  const apiError = useApiError();
  const id = useId();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword: password }),
      skipAuth: true,
    });
    setSubmitting(false);
    if (!res.ok) return setError(apiError(await readApiError(res), t("genericError")));
    setDone(true);
  }

  if (!token) {
    return (
      <>
        <p className="text-steel text-sm mb-4">{t("resetMissingToken")}</p>
        <Link href="/forgot-password" className="underline text-sm">{t("requestNewLink")}</Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <p className="text-emerald-700 text-sm mb-4" role="status">{t("resetDone")}</p>
        <Link href="/login" className="btn-primary inline-block">{t("loginButton")}</Link>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${id}-password`} className="block text-sm font-medium mb-1 text-steel">{t("newPassword")}</label>
        <PasswordInput
          id={`${id}-password`}
          autoComplete="new-password"
          required
          minLength={10}
          aria-describedby={`${id}-hint`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={authInputClass}
        />
        <p id={`${id}-hint`} className="text-xs text-steel mt-1">{t("passwordHint")}</p>
      </div>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-amber text-ink py-2.5 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
      >
        {submitting ? t("saving") : t("resetButton")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations("Auth");
  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">{t("resetTitle")}</h1>
      <Suspense>
        <ResetPasswordInner />
      </Suspense>
    </main>
  );
}
