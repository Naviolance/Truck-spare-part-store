"use client";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { SOCIAL } from "@/lib/site";

// Always-visible "chat with us" button, bottom-right on every storefront
// page — for many customers here, WhatsApp IS the way they buy.
// Hidden where the page already has its own WhatsApp button or a primary
// action at the bottom of a phone screen it would cover (add to cart, pay).
const HIDDEN_ON = [/^\/products\/[^/]+$/, /^\/cart/, /^\/orders\//];

export function FloatingWhatsApp() {
  const t = useTranslations("Navbar");
  const pathname = usePathname();
  if (!SOCIAL.whatsapp || HIDDEN_ON.some((re) => re.test(pathname))) return null;
  return (
    <a
      href={SOCIAL.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", { from: "floating" })}
      aria-label={t("whatsapp")}
      title={t("whatsapp")}
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-150 hover:scale-105 print:hidden"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.94-4.66-4.12-.13-.18-1.1-1.47-1.1-2.81s.7-2 .96-2.27c.24-.27.53-.34.71-.34l.51.01c.16.01.38-.06.59.45.24.55.79 1.9.86 2.04.07.13.11.3.02.48-.09.18-.13.29-.27.45l-.4.47c-.13.13-.27.28-.12.55.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.61-.13.25.09 1.59.75 1.86.89.27.13.45.2.52.31.07.11.07.65-.17 1.33z" />
      </svg>
    </a>
  );
}
