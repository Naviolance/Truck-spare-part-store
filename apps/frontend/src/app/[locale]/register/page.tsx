"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { RegisterForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/api";

function RegisterPageInner() {
  const t = useTranslations("Auth");
  const { user, loading } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  useEffect(() => {
    if (!loading && user) router.replace(next ?? "/");
  }, [loading, user, next, router]);

  return (
    <AuthLayout mode="register" next={next}>
      <h1 className="text-2xl font-display font-bold mb-6 text-ink">{t("registerTitle")}</h1>
      <RegisterForm onSuccess={() => router.replace(next ?? "/")} />
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}
