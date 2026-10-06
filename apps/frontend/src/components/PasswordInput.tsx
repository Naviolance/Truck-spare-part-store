"use client";
import { useState, InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const t = useTranslations("Auth");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-steel pointer-events-none">
        <LockIcon />
      </span>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className ?? ""} pl-10 pr-16`}
      />
      {/* Reachable by keyboard and announced to screen readers. */}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-xs text-steel hover:text-ink transition-colors duration-200"
      >
        {visible ? t("hide") : t("show")}
      </button>
    </div>
  );
}
