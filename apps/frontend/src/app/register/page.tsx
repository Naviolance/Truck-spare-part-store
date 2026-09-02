"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { IconInput, MailIcon, UserIcon } from "@/components/IconInput";
import { AuthLayout } from "@/components/AuthLayout";

const inputClass = "w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500";

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
    <AuthLayout mode="register">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-700">First name</label>
            <IconInput
              icon={<UserIcon />}
              required
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-700">Last name</label>
            <IconInput
              icon={<UserIcon />}
              required
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Email</label>
          <IconInput
            icon={<MailIcon />}
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Password</label>
          <PasswordInput
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className={inputClass}
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
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </AuthLayout>
  );
}
