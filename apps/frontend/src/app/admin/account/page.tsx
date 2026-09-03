"use client";
import { AccountDetails } from "@/components/AccountDetails";

export default function AdminAccountPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-1">Personal details</h1>
      <p className="text-sm text-zinc-500 mb-6">Your own profile info — not shown to customers.</p>
      <AccountDetails variant="admin" />
    </div>
  );
}
