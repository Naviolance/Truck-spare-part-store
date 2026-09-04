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
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm text-zinc-600 transition-colors duration-200 hover:text-zinc-900">
            View all &rarr;
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950 text-white">
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/60 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wide mb-3">New &amp; used, inspected</p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-xl">
            Truck parts that fit, without the guesswork.
          </h1>
          <p className="text-zinc-300 mt-4 max-w-lg text-base sm:text-lg">
            Search by vehicle or browse the catalogue. Every listing shows condition, part number, and
            compatibility up front — view and pick up in person once you're ready.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/find-my-part"
              className="rounded-lg bg-white text-zinc-900 px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 hover:bg-zinc-100 hover:shadow-lg"
            >
              Find My Part
            </Link>
            <Link
              href="/products"
              className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-white/10"
            >
              Browse all parts
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { title: "Condition you can trust", body: "Every part is graded new, used, or reconditioned, with notes when it matters." },
          { title: "Built for your truck", body: "Use Find My Part to filter by manufacturer, model, and engine." },
          { title: "See it before you buy", body: "View parts in person and pick up locally — no shipping guesswork." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold text-zinc-900">{f.title}</h3>
            <p className="text-sm text-zinc-500 mt-1">{f.body}</p>
          </div>
        ))}
      </section>

      {products.length === 0 ? (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
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
