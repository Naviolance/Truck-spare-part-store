"use client";
import { useTranslations } from "next-intl";
import { AccountDetails } from "@/components/AccountDetails";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function AdminAccountPage() {
  const t = useTranslations("AdminAccount");
  return (
    <div className="flex max-w-lg flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="admin-title">{t("title")}</h1>
        <p className="text-steel">{t("subtitle")}</p>
      </div>
      <AccountDetails variant="admin" />
      <section className="admin-card p-4 sm:p-5">
        <ChangePasswordForm />
      </section>
    </div>
  );
}
