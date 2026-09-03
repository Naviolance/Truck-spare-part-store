"use client";
import { AccountDetails } from "@/components/AccountDetails";

export default function AccountPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mt-1 mb-1">Your account</h1>
      <p className="text-sm text-zinc-500 mb-6">Your details and default contact info for orders.</p>
      <AccountDetails variant="customer" />
    </main>
  );
}
