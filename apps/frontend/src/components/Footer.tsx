import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CREDIT, SOCIAL, WHATSAPP_DISPLAY } from "@/lib/site";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h3l1-3h-4V9c0-.6.4-1 1-1z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Only accounts that exist are shown — no "#" placeholder links.
const SOCIAL_LINKS = [
  { name: "Facebook", href: SOCIAL.facebook, icon: <FacebookIcon /> },
  { name: "TikTok", href: SOCIAL.tiktok, icon: <TikTokIcon /> },
  { name: "Instagram", href: SOCIAL.instagram, icon: <InstagramIcon /> },
].filter((s): s is typeof s & { href: string } => Boolean(s.href));

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <p className="font-display font-bold text-sm text-amber mb-3 pb-2 border-b border-paper/15">{children}</p>;
}

const linkClass = "transition-colors duration-200 hover:text-paper";

export async function Footer() {
  const year = new Date().getFullYear();
  const t = await getTranslations("Footer");

  return (
    <footer className="bg-ink mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <p className="font-display font-black text-2xl text-paper tracking-tight">TruckParts</p>
          <p className="text-sm text-paper/60 mt-2">{t("tagline")}</p>
          <div className="flex items-center gap-4 mt-5">
            <WhatsAppButton href={SOCIAL.whatsapp} label="WhatsApp" source="footer_icon" variant="icon" />
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="text-paper/50 transition-colors duration-200 hover:text-amber"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <FooterHeading>{t("shop")}</FooterHeading>
          <ul className="space-y-2 text-sm text-paper/70">
            <li><Link href="/products" className={linkClass}>{t("allParts")}</Link></li>
            <li><Link href="/find-my-part" className={linkClass}>{t("findMyPart")}</Link></li>
            <li><Link href="/trucks" className={linkClass}>{t("byTruck")}</Link></li>
            <li><Link href="/categories" className={linkClass}>{t("byCategory")}</Link></li>
            <li><Link href="/brands" className={linkClass}>{t("byBrand")}</Link></li>
          </ul>
        </div>

        <div>
          <FooterHeading>{t("account")}</FooterHeading>
          <ul className="space-y-2 text-sm text-paper/70">
            <li><Link href="/login" className={linkClass}>{t("login")}</Link></li>
            <li><Link href="/register" className={linkClass}>{t("createAccount")}</Link></li>
            <li><Link href="/orders" className={linkClass}>{t("orderHistory")}</Link></li>
            <li><Link href="/cart" className={linkClass}>{t("cart")}</Link></li>
            <li><Link href="/about" className={linkClass}>{t("about")}</Link></li>
          </ul>
        </div>

        <div>
          <FooterHeading>{t("contact")}</FooterHeading>
          <p className="text-sm text-paper/70">{t("contactBody")}</p>
          {WHATSAPP_DISPLAY && <p className="text-sm text-paper font-mono mt-2">{WHATSAPP_DISPLAY}</p>}
          <WhatsAppButton href={SOCIAL.whatsapp} label={t("whatsappUs")} source="footer" className="mt-3" />
          <p className="text-xs text-paper/50 mt-4">{t("visitUsBody")}</p>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs font-mono text-paper/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>{t("rights", { year })}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className={linkClass}>{t("privacy")}</Link>
            <p>{t("pricesNote")}</p>
            <p>
              {t.rich("builtBy", {
                link: (chunks) => (
                  <a href={CREDIT.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-amber">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
