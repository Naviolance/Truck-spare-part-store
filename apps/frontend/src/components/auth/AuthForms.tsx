"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { IconInput, MailIcon, UserIcon } from "@/components/IconInput";

// The login and registration forms, used by the /login and /register pages
// AND the in-page AuthModal — one implementation of the fields, validation
// messages, autofill hints and accessibility, instead of three copies.

export const authInputClass =
  "w-full border border-steel-light rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-steel";
const labelClass = "block text-sm font-medium mb-1 text-steel";
const submitClass =
  "w-full bg-amber text-ink py-2.5 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50";

function useSubmit(action: () => Promise<void>, onSuccess: () => void) {
  const t = useTranslations("Auth");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await action();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }
  return { submit, error, submitting };
}

export function LoginForm({
  onSuccess,
  initialEmail = "",
  initialPassword = "",
}: {
  onSuccess: () => void;
  initialEmail?: string;
  initialPassword?: string;
}) {
  const t = useTranslations("Auth");
  const { login } = useAuth();
  const id = useId();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const { submit, error, submitting } = useSubmit(() => login(email.trim(), password), onSuccess);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={`${id}-email`} className={labelClass}>{t("email")}</label>
        <IconInput
          id={`${id}-email`}
          icon={<MailIcon />}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authInputClass}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={`${id}-password`} className="block text-sm font-medium text-steel">{t("password")}</label>
          <Link href="/forgot-password" className="text-xs text-steel underline-offset-2 hover:underline hover:text-ink">
            {t("forgot")}
          </Link>
        </div>
        <PasswordInput
          id={`${id}-password`}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={authInputClass}
        />
      </div>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={submitting} className={submitClass}>
        {submitting ? t("loggingIn") : t("loginButton")}
      </button>
    </form>
  );
}

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("Auth");
  const { register } = useAuth();
  const id = useId();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const { submit, error, submitting } = useSubmit(
    () => register({ ...form, email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim() }),
    onSuccess,
  );
  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-first`} className={labelClass}>{t("firstName")}</label>
          <IconInput id={`${id}-first`} icon={<UserIcon />} autoComplete="given-name" required value={form.firstName} onChange={update("firstName")} className={authInputClass} />
        </div>
        <div>
          <label htmlFor={`${id}-last`} className={labelClass}>{t("lastName")}</label>
          <IconInput id={`${id}-last`} icon={<UserIcon />} autoComplete="family-name" required value={form.lastName} onChange={update("lastName")} className={authInputClass} />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-email`} className={labelClass}>{t("email")}</label>
        <IconInput id={`${id}-email`} icon={<MailIcon />} type="email" autoComplete="email" inputMode="email" required value={form.email} onChange={update("email")} className={authInputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-password`} className={labelClass}>{t("password")}</label>
        <PasswordInput
          id={`${id}-password`}
          autoComplete="new-password"
          required
          minLength={10}
          aria-describedby={`${id}-password-hint`}
          value={form.password}
          onChange={update("password")}
          className={authInputClass}
        />
        <p id={`${id}-password-hint`} className="text-xs text-steel mt-1">{t("passwordHint")}</p>
      </div>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={submitting} className={submitClass}>
        {submitting ? t("registering") : t("registerButton")}
      </button>
      <p className="text-xs text-steel text-center">
        {t.rich("agree", {
          link: (chunks) => <Link href="/privacy" className="underline hover:text-ink">{chunks}</Link>,
        })}
      </p>
    </form>
  );
}
