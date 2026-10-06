import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SOCIAL } from "@/lib/site";

// A 404 is still a chance to keep the visitor: offer the catalog and a
// direct line to the store instead of a dead end.
export async function NotFoundContent() {
  const t = await getTranslations("NotFound");
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-steel mb-2">404</p>
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">{t("title")}</h1>
        <p className="text-steel mb-8">{t("body")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="bg-amber text-ink px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-amber-dark">
            {t("home")}
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-steel-light px-5 py-2.5 text-sm font-semibold text-steel transition-colors duration-200 hover:border-steel hover:text-ink"
          >
            {t("browse")}
          </Link>
          {SOCIAL.whatsapp && (
            <a
              href={SOCIAL.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-50"
            >
              {t("ask")}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
