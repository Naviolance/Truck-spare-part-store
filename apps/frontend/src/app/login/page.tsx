"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { IconInput, MailIcon } from "@/components/IconInput";
import { AuthLayout } from "@/components/AuthLayout";

const inputClass = "w-full border border-steel-light rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-steel";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout mode="login">
      <h1 className="text-2xl font-display font-bold mb-6 text-ink">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-steel">Email</label>
          <IconInput
            icon={<MailIcon />}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-steel">Password</label>
            <Link href="/forgot-password" className="text-xs text-steel hover:text-steel transition-colors duration-200">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber text-ink py-2 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
