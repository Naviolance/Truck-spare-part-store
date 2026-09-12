import Link from "next/link";
import Image from "next/image";
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

function ProductSection({ title, viewAllHref, products }: { title: string; viewAllHref?: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-baseline justify-between mb-6 pb-3 border-b-2 border-ink">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm font-medium text-steel transition-colors duration-200 hover:text-ink">
            View all parts
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [products, mostPurchased, mostSearched] = await Promise.all([
    getProducts(),
    getRanked("/products/most-purchased?limit=6"),
    getRanked("/products/most-searched?limit=6"),
  ]);

  return (
    <main className="flex-1">
      {/* Hero — asymmetric two-up, not a full-bleed photo with text over it */}
      <section className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3 py-16 sm:py-20 lg:pr-12 flex flex-col justify-center">
            <h1 className="font-display font-black text-4xl sm:text-6xl leading-[0.95] tracking-tight max-w-xl">
              Truck parts that fit, without the guesswork.
            </h1>
            <p className="text-paper/70 mt-6 max-w-md text-base sm:text-lg">
              We grade every part new, used, or reconditioned before it's listed, and you inspect it in person
              before you buy — search by vehicle or browse the full catalogue below.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/find-my-part" className="btn-primary">
                Find My Part
              </Link>
              <Link href="/products" className="btn-outline border-paper/40 text-paper hover:bg-paper hover:text-ink">
                Browse all parts
              </Link>
            </div>
          </div>
          <div className="lg:col-span-2 relative min-h-[280px] lg:min-h-0 border-t-4 lg:border-t-0 lg:border-l-4 border-amber">
            <Image src="/hero-bg.jpg" alt="Truck parts on the shop floor" fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Value props — left accent bar reads as a spec sheet, not a card kit */}
      <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { title: "Condition you can trust", body: "Every part is graded new, used, or reconditioned, with notes when it matters." },
          { title: "Built for your truck", body: "Use Find My Part to filter by manufacturer, model, and engine." },
          { title: "See it before you buy", body: "View parts in person and pick up locally — no shipping guesswork." },
        ].map((f) => (
          <div key={f.title} className="border-l-4 border-steel pl-4 py-1">
            <h3 className="font-display font-bold text-lg text-ink">{f.title}</h3>
            <p className="text-sm text-ink/60 mt-1">{f.body}</p>
          </div>
        ))}
      </section>

      {products.length === 0 ? (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="border-2 border-dashed border-steel-light p-8 text-center text-steel">
            <p className="font-medium">No products loaded yet.</p>
            <p className="text-sm mt-1">Make sure the backend is running and the database has been seeded.</p>
          </div>
        </section>
      ) : (
        <>
          <ProductSection title="Latest parts" viewAllHref="/products" products={products} />
          <ProductSection title="Most purchased" viewAllHref="/products" products={mostPurchased} />
          <ProductSection title="Most searched" viewAllHref="/products" products={mostSearched} />
        </>
      )}
    </main>
  );
}
