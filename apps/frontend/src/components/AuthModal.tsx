"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { IconInput, MailIcon, UserIcon } from "@/components/IconInput";

const inputClass = "w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-zinc-500";

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called right after a successful login/signup, before the modal closes. */
  onAuthenticated?: () => void;
  message?: string;
};

export function AuthModal({ open, onClose, onAuthenticated, message }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setError(null);
      setSubmitting(false);
      setForm({ email: "", password: "", firstName: "", lastName: "" });
      setMode("login");
    }
  }, [open]);

  if (!open) return null;

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      onAuthenticated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6 relative animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-zinc-400 transition-colors duration-200 hover:text-zinc-700"
        >
          <CloseIcon />
        </button>

        <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-1">
          {mode === "login" ? "Log in" : "Create an account"}
        </h2>
        <p className="text-sm text-zinc-500 mb-5">
          {message || (mode === "login" ? "Log in to continue." : "Sign up to continue.")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                icon={<UserIcon />}
                placeholder="First name"
                required
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={inputClass}
              />
              <IconInput
                icon={<UserIcon />}
                placeholder="Last name"
                required
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <IconInput
            icon={<MailIcon />}
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
          <div>
            <PasswordInput
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={inputClass}
            />
            {mode === "register" && (
              <p className="text-xs text-zinc-500 mt-1">
                At least 10 characters, with uppercase, lowercase, a number, and a symbol.
              </p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-50"
          >
            {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-zinc-500 mt-4 text-center">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-zinc-900 font-medium underline transition-colors duration-200 hover:text-zinc-600"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
