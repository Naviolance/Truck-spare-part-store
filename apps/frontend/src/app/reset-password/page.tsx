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
        <h1 className="text-2xl font-bold mb-4">Invalid link</h1>
        <p className="text-gray-600 text-sm">
          This reset link is missing its token. Request a new one from{" "}
          <Link href="/forgot-password" className="underline">here</Link>.
        </p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">Password updated</h1>
        <p className="text-gray-600 text-sm">Redirecting you to log in…</p>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Set a new password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">New password</label>
          <PasswordInput
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            At least 10 characters, with uppercase, lowercase, a number, and a symbol.
          </p>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gray-900 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="max-w-sm mx-auto px-4 py-16 text-gray-500">Loading…</main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}