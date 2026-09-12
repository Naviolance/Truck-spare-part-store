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
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-4">Check your email</h1>
        <p className="text-steel text-sm">
          If an account exists for {email}, we&apos;ve sent a link to reset your password.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Forgot your password?</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-steel">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-steel-light rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-steel"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber text-ink py-2 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-sm text-steel mt-4">
        <Link href="/login" className="underline transition-colors duration-200 hover:text-ink">Back to log in</Link>
      </p>
    </main>
  );
}
