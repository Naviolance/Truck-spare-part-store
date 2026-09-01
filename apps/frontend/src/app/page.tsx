import Link from "next/link";
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
    const res = await fetch(`${apiUrl}/products`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
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
        <h1 className="text-3xl font-bold">TruckParts</h1>
        <p className="text-gray-600 mt-1">Quality truck spare parts, new and used.</p>
      </header>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
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
              className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0].url}
                  alt={product.images[0].altText ?? product.name}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {product.brand?.name ?? "Unbranded"} · {product.category.name}
                </p>
                <h2 className="font-semibold mt-1">{product.name}</h2>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold">${product.price}</span>
                  <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">{product.condition}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
