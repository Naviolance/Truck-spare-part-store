"use client";
import { AccountDetails } from "@/components/AccountDetails";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function AdminAccountPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Personal details</h1>
      <p className="text-sm text-steel mb-6">Your own profile info — not shown to customers.</p>
      <AccountDetails variant="admin" />
      <div className="mt-10 border-t border-steel-light pt-8">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
