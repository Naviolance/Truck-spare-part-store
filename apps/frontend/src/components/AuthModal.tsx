"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { LoginForm, RegisterForm } from "@/components/auth/AuthForms";

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
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

// Log in or sign up without leaving the page (e.g. "Add to cart" while
// logged out). Same forms as /login and /register.
export function AuthModal({ open, onClose, onAuthenticated, message }: Props) {
  const t = useTranslations("Auth");
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (!open) return;
    setMode("login");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function done() {
    onAuthenticated?.();
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-6 relative animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label={t("close")} className="absolute top-4 right-4 text-steel transition-colors duration-200 hover:text-ink">
          <CloseIcon />
        </button>

        <h2 id="auth-modal-title" className="text-xl font-display font-bold text-ink tracking-tight mb-1">
          {mode === "login" ? t("loginTitle") : t("registerTitle")}
        </h2>
        <p className="text-sm text-steel mb-5">{message || (mode === "login" ? t("modalLoginHint") : t("modalRegisterHint"))}</p>

        {mode === "login" ? <LoginForm onSuccess={done} /> : <RegisterForm onSuccess={done} />}

        <p className="text-sm text-steel mt-4 text-center">
          {mode === "login" ? t("newHere") : t("haveAccount")}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-ink font-medium underline transition-colors duration-200 hover:text-steel"
          >
            {mode === "login" ? t("switchToRegister") : t("switchToLogin")}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
