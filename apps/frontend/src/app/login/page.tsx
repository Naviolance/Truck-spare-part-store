"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { IconInput, MailIcon } from "@/components/IconInput";
import { AuthLayout } from "@/components/AuthLayout";

const inputClass = "w-full border border-steel-light rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-steel";

// Read-only demo admin, so visitors can explore the admin panel. Only shown
// when both are set (Vercel env vars), so the page never advertises a login
// that doesn't exist in that environment's database. The backend makes this
// account read-only; see DemoReadOnlyInterceptor.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

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

      {DEMO_EMAIL && DEMO_PASSWORD && (
        <div className="mt-6 rounded-lg border border-steel-light p-4 text-sm">
          <p className="font-medium text-ink">Want to see the admin panel?</p>
          <p className="mt-1 text-steel">
            Log in with the demo account. It&apos;s read-only, so look around freely.
          </p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-ink">
            <dt className="text-steel">Email</dt>
            <dd className="break-all">{DEMO_EMAIL}</dd>
            <dt className="text-steel">Password</dt>
            <dd>{DEMO_PASSWORD}</dd>
          </dl>
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO_EMAIL);
              setPassword(DEMO_PASSWORD);
            }}
            className="mt-3 w-full border border-ink py-2 font-medium text-ink transition-colors duration-150 hover:bg-ink hover:text-white"
          >
            Use demo account
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
