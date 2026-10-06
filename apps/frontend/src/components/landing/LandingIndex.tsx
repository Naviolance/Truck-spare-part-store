import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export type IndexItem = {
  href: string;
  name: string;
  count: number;
  children?: { href: string; name: string; count: number }[];
};

// The /categories, /brands and /trucks index pages: a crawlable list of
// links into every landing page that actually has parts.
export async function LandingIndex({
  locale,
  path,
  heading,
  intro,
  items,
}: {
  locale: string;
  path: string;
  heading: string;
  intro: string;
  items: IndexItem[];
}) {
  const t = await getTranslations("Landing");
  const visible = items.filter((i) => i.count > 0);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("home"), path: `/${locale}` },
          { name: heading, path: `/${locale}${path}` },
        ])}
      />
      <div className="mb-8 pb-3 border-b-2 border-ink">
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight">{heading}</h1>
        <p className="text-steel mt-2 max-w-3xl">{intro}</p>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((item) => (
          <li key={item.href} className="bg-white border border-steel-light p-4 transition-colors hover:border-ink">
            <Link href={item.href} className="block">
              <span className="font-display font-bold text-lg text-ink">{item.name}</span>
              <span className="block text-sm text-steel">{t("productCount", { count: item.count })}</span>
            </Link>
            {item.children && item.children.some((c) => c.count > 0) && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {item.children
                  .filter((c) => c.count > 0)
                  .map((child) => (
                    <li key={child.href}>
                      <Link href={child.href} className="text-xs border border-steel-light px-2 py-1 text-steel hover:text-ink hover:border-ink">
                        {child.name} ({child.count})
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <Link href="/find-my-part" className="btn-primary">{t("findMyPart")}</Link>
      </div>
    </main>
  );
}
