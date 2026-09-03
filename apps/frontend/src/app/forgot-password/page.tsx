"use client";
import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-4">Check your email</h1>
        <p className="text-zinc-600 text-sm">
          If an account exists for {email}, we&apos;ve sent a link to reset your password.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Forgot your password?</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white py-2 font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-sm text-zinc-600 mt-4">
        <Link href="/login" className="underline transition-colors duration-200 hover:text-zinc-900">Back to log in</Link>
      </p>
    </main>
  );
}
