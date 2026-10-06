"use client";
import { track } from "@/lib/analytics";

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.94-4.66-4.12-.13-.18-1.1-1.47-1.1-2.81s.7-2 .96-2.27c.24-.27.53-.34.71-.34l.51.01c.16.01.38-.06.59.45.24.55.79 1.9.86 2.04.07.13.11.3.02.48-.09.18-.13.29-.27.45l-.4.47c-.13.13-.27.28-.12.55.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.61-.13.25.09 1.59.75 1.86.89.27.13.45.2.52.31.07.11.07.65-.17 1.33z" />
    </svg>
  );
}

// Every WhatsApp entry point on the site. `source` tells the analytics which
// page/position produced the conversation (product page vs footer vs 404...),
// so the owner can see which pages actually generate customers.
export function WhatsAppButton({
  href,
  label,
  source,
  variant = "solid",
  className = "",
}: {
  href: string | null;
  label: string;
  source: string;
  variant?: "solid" | "outline" | "icon";
  className?: string;
}) {
  if (!href) return null;
  const styles = {
    solid: "inline-flex items-center justify-center gap-2 bg-[#25D366] text-ink px-4 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-[#1ebe5a]",
    outline: "inline-flex items-center justify-center gap-2 border border-emerald-600 text-emerald-700 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-emerald-50",
    icon: "inline-flex items-center text-paper/50 transition-colors duration-200 hover:text-amber",
  }[variant];

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", { from: source })}
      aria-label={variant === "icon" ? label : undefined}
      className={`${styles} ${className}`}
    >
      <WhatsAppIcon />
      {variant !== "icon" && label}
    </a>
  );
}
