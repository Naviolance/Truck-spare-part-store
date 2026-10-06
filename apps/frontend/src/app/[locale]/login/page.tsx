"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/api";

// Read-only demo admin, so visitors can explore the admin panel. Only shown
// when both are set (Vercel env vars), so the page never advertises a login
// that doesn't exist in that environment's database. The backend makes this
// account read-only; see DemoReadOnlyInterceptor.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

function LoginPageInner() {
  const t = useTranslations("Auth");
  const { user, loading } = useAuth();
  const router = useRouter();
  // Back to where the customer was (e.g. /checkout), never off-site.
  const next = safeNext(useSearchParams().get("next"));
  const [demoFill, setDemoFill] = useState(false);

  // The admin isn't under /fr|/en, so it can't go through the locale-aware router.
  const goNext = useCallback(() => {
    if (next?.startsWith("/admin")) window.location.assign(next);
    else router.replace(next ?? "/");
  }, [next, router]);

  // Already logged in (or just logged in): go on.
  useEffect(() => {
    if (!loading && user) goNext();
  }, [loading, user, goNext]);

  return (
    <AuthLayout mode="login" next={next}>
      <h1 className="text-2xl font-display font-bold mb-6 text-ink">{t("loginTitle")}</h1>
      {/* `key` remounts the form so the demo button can pre-fill it. */}
      <LoginForm
        key={demoFill ? "demo" : "blank"}
        initialEmail={demoFill ? DEMO_EMAIL : ""}
        initialPassword={demoFill ? DEMO_PASSWORD : ""}
        onSuccess={goNext}
      />

      {DEMO_EMAIL && DEMO_PASSWORD && (
        <div className="mt-6 rounded-lg border border-steel-light p-4 text-sm">
          <p className="font-medium text-ink">{t("demoTitle")}</p>
          <p className="mt-1 text-steel">{t("demoBody")}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-ink">
            <dt className="text-steel">{t("email")}</dt>
            <dd className="break-all">{DEMO_EMAIL}</dd>
            <dt className="text-steel">{t("password")}</dt>
            <dd>{DEMO_PASSWORD}</dd>
          </dl>
          <button
            type="button"
            onClick={() => setDemoFill(true)}
            className="mt-3 w-full border border-ink py-2 font-medium text-ink transition-colors duration-150 hover:bg-ink hover:text-white"
          >
            {t("demoUse")}
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
