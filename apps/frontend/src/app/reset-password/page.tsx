"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
      skipAuth: true,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Could not reset your password");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <main className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-4">Invalid link</h1>
        <p className="text-zinc-600 text-sm">
          This reset link is missing its token. Request a new one from{" "}
          <Link href="/forgot-password" className="underline transition-colors duration-200 hover:text-zinc-900">here</Link>.
        </p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-4">Password updated</h1>
        <p className="text-zinc-600 text-sm">Redirecting you to log in…</p>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Set a new password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">New password</label>
          <PasswordInput
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            At least 10 characters, with uppercase, lowercase, a number, and a symbol.
          </p>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white py-2 font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-50"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="max-w-sm mx-auto px-4 py-16 text-zinc-500">Loading…</main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
