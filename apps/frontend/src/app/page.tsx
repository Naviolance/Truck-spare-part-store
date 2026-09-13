import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ProductCard, ProductCardData } from "@/components/ProductCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function getProducts(): Promise<ProductCardData[]> {
  try {
    const res = await fetch(`${API_URL}/products?limit=12`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  } catch {
    // Backend not reachable yet — fail gracefully so the page still renders
    return [];
  }
}

async function getRanked(path: string): Promise<ProductCardData[]> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function ProductSection({ title, viewAllHref, viewAllLabel, products }: { title: string; viewAllHref?: string; viewAllLabel: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-baseline justify-between mb-6 pb-3 border-b-2 border-ink">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm font-medium text-steel transition-colors duration-200 hover:text-ink">
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [products, mostPurchased, mostSearched, tHero, tValueProps, tHome] = await Promise.all([
    getProducts(),
    getRanked("/products/most-purchased?limit=6"),
    getRanked("/products/most-searched?limit=6"),
    getTranslations("Hero"),
    getTranslations("ValueProps"),
    getTranslations("Home"),
  ]);

  const valueProps = [
    { title: tValueProps("conditionTitle"), body: tValueProps("conditionBody") },
    { title: tValueProps("fitTitle"), body: tValueProps("fitBody") },
    { title: tValueProps("seeTitle"), body: tValueProps("seeBody") },
  ];

  return (
    <main className="flex-1">
      {/* Hero — full-bleed background photo, text overlaid on a dark scrim */}
      <section className="relative min-h-[480px] sm:min-h-[560px] flex items-center text-paper border-b-4 border-amber overflow-hidden">
        <Image
          src="/hero-bg.jpg"
          alt="Truck parts on the shop floor"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/40" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20 w-full">
          <div className="max-w-xl">
            <h1 className="font-display font-black text-4xl sm:text-6xl leading-[0.95] tracking-tight">
              {tHero("title")}
            </h1>
            <p className="text-paper/70 mt-6 max-w-md text-base sm:text-lg">
              {tHero("subtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/find-my-part" className="btn-primary">
                {tHero("findMyPart")}
              </Link>
              <Link href="/products" className="btn-outline border-paper/40 text-paper hover:bg-paper hover:text-ink">
                {tHero("browseAll")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value props — left accent bar reads as a spec sheet, not a card kit */}
      <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {valueProps.map((f) => (
          <div key={f.title} className="border-l-4 border-steel pl-4 py-1">
            <h3 className="font-display font-bold text-lg text-ink">{f.title}</h3>
            <p className="text-sm text-ink/60 mt-1">{f.body}</p>
          </div>
        ))}
      </section>

      {products.length === 0 ? (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="border-2 border-dashed border-steel-light p-8 text-center text-steel">
            <p className="font-medium">{tHome("noProductsTitle")}</p>
            <p className="text-sm mt-1">{tHome("noProductsBody")}</p>
          </div>
        </section>
      ) : (
        <>
          <ProductSection title={tHome("latestParts")} viewAllHref="/products" viewAllLabel={tHome("viewAll")} products={products} />
          <ProductSection title={tHome("mostPurchased")} viewAllHref="/products" viewAllLabel={tHome("viewAll")} products={mostPurchased} />
          <ProductSection title={tHome("mostSearched")} viewAllHref="/products" viewAllLabel={tHome("viewAll")} products={mostSearched} />
        </>
      )}
    </main>
  );
}
