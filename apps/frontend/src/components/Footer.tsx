import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Placeholder targets ("#") until the client shares real account URLs -
// swap these once available, nothing else needs to change.
const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h3l1-3h-4V9c0-.6.4-1 1-1z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M20 12a8 8 0 1 1-3.8-6.8L20 4l-1.2 3.9A7.96 7.96 0 0 1 20 12Z" />
        <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.5 0 1-.6.5-1l-1-1.5-1.5.5c-.8-.5-1.6-1.2-2-2L11 9.5 9.5 8.5c-.4-.5-1-.2-1 .3v.7Z" />
      </svg>
    ),
  },
];

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <p className="font-display font-bold text-sm text-amber mb-3 pb-2 border-b border-paper/15">{children}</p>;
}

export async function Footer() {
  const year = new Date().getFullYear();
  const t = await getTranslations("Footer");

  return (
    <footer className="bg-ink mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-4 gap-10">
        <div>
          <p className="font-display font-black text-2xl text-paper tracking-tight">TruckParts</p>
          <p className="text-sm text-paper/60 mt-2">{t("tagline")}</p>
          <div className="flex items-center gap-4 mt-5">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.href}
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
            <li><Link href="/products" className="transition-colors duration-200 hover:text-paper">{t("allParts")}</Link></li>
            <li><Link href="/find-my-part" className="transition-colors duration-200 hover:text-paper">{t("findMyPart")}</Link></li>
            <li><Link href="/cart" className="transition-colors duration-200 hover:text-paper">{t("cart")}</Link></li>
            <li><Link href="/about" className="transition-colors duration-200 hover:text-paper">{t("about")}</Link></li>
          </ul>
        </div>

        <div>
          <FooterHeading>{t("account")}</FooterHeading>
          <ul className="space-y-2 text-sm text-paper/70">
            <li><Link href="/login" className="transition-colors duration-200 hover:text-paper">{t("login")}</Link></li>
            <li><Link href="/register" className="transition-colors duration-200 hover:text-paper">{t("createAccount")}</Link></li>
            <li><Link href="/orders" className="transition-colors duration-200 hover:text-paper">{t("orderHistory")}</Link></li>
          </ul>
        </div>

        <div>
          <FooterHeading>{t("visitUs")}</FooterHeading>
          <p className="text-sm text-paper/70">{t("visitUsBody")}</p>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs font-mono text-paper/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>{t("rights", { year })}</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors duration-200 hover:text-paper">{t("privacy")}</Link>
            <p>{t("pricesNote")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
