import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import { isUnoptimizableImage } from "@/lib/image";
type Product = {
  id: string;
  slug: string;
  name: string;
  price: string;
  condition: string;
  images: { url: string; altText: string | null }[];
  category: { name: string };
  brand: { name: string } | null;
};

async function getProducts(): Promise<Product[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/products?limit=12`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  } catch {
    // Backend not reachable yet — fail gracefully so the page still renders
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">TruckParts</h1>
        <p className="text-zinc-500 mt-1">Quality truck spare parts, new and used.</p>
      </header>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
          <p className="font-medium">No products loaded yet.</p>
          <p className="text-sm mt-1">
            Make sure the backend is running and the database has been seeded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-300"
            >
              {product.images[0] && (
                <div className="relative w-full h-40 overflow-hidden">
                  <Image
                    src={product.images[0].url}
                    alt={product.images[0].altText ?? product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized={isUnoptimizableImage(product.images[0].url)}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  {product.brand?.name ?? "Unbranded"} · {product.category.name}
                </p>
                <h2 className="font-semibold mt-1 text-zinc-900">{product.name}</h2>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-zinc-900">{formatMoney(product.price)}</span>
                  <span className="text-xs rounded-full bg-zinc-100 text-zinc-600 px-2 py-0.5">{product.condition}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
