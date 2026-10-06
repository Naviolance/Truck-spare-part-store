"use client";
import { useTranslations } from "next-intl";
import { AccountDetails } from "@/components/AccountDetails";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function AdminAccountPage() {
  const t = useTranslations("AdminAccount");
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">{t("title")}</h1>
      <p className="text-sm text-steel mb-6">{t("subtitle")}</p>
      <AccountDetails variant="admin" />
      <div className="mt-10 border-t border-steel-light pt-8">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
