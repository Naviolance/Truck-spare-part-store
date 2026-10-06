"use client";
import { useTranslations } from "next-intl";
import { AccountDetails } from "@/components/AccountDetails";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { useRequireAuth } from "@/lib/use-require-auth";

export default function AccountPage() {
  const t = useTranslations("Account");
  const tc = useTranslations("Common");
  const { ready } = useRequireAuth();
  if (!ready) return <main className="max-w-lg mx-auto px-4 py-16 text-steel">{tc("loading")}</main>;

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mt-1 mb-1">{t("title")}</h1>
      <p className="text-sm text-steel mb-6">{t("intro")}</p>
      <AccountDetails variant="customer" />
      <div className="mt-10 border-t border-steel-light pt-8">
        <ChangePasswordForm />
      </div>
    </main>
  );
}
