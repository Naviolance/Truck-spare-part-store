"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">First name</label>
            <input
              required
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last name</label>
            <input
              required
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <PasswordInput
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
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
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-4">
        Already have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  );
}