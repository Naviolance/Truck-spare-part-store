import Link from "next/link";
import { notFound } from "next/navigation";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  quantity: number;
  condition: string;
  conditionNotes: string | null;
  partNumber: string | null;
  crossReference: string[];
  category: { name: string; slug: string };
  brand: { name: string } | null;
  images: { url: string; altText: string | null }[];
  compatibility: { vehicle: { manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null } }[];
  reviews: { id: string; rating: number; comment: string | null }[];
};

async function getProduct(slug: string): Promise<Product | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/products/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const avgRating =
    product.reviews.length > 0
      ? (product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1)
      : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-gray-500 hover:underline">&larr; Back to all products</Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
        {/* Images */}
        <div>
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.images[0].altText ?? product.name}
              className="w-full aspect-square object-cover rounded-lg border border-gray-200"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {product.images.slice(1).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.url}
                  src={img.url}
                  alt={img.altText ?? product.name}
                  className="w-20 h-20 object-cover rounded border border-gray-200 shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {product.brand?.name ?? "Unbranded"} · {product.category.name}
          </p>
          <h1 className="text-2xl font-bold mt-1">{product.name}</h1>

          <div className="flex items-center gap-3 mt-3">
            <span className="text-2xl font-bold">${product.price}</span>
            <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">{product.condition}</span>
            {avgRating && (
              <span className="text-sm text-gray-500">★ {avgRating} ({product.reviews.length} review{product.reviews.length !== 1 ? "s" : ""})</span>
            )}
          </div>

          <p className={`text-sm mt-2 ${product.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
            {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
          </p>

          {product.conditionNotes && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
              <span className="font-medium">Condition notes: </span>
              {product.conditionNotes}
            </div>
          )}

          <p className="text-gray-700 mt-4 whitespace-pre-line">{product.description}</p>

          {(product.partNumber || product.crossReference.length > 0) && (
            <div className="mt-4 text-sm text-gray-600 space-y-1">
              {product.partNumber && <p>Part number: <span className="font-mono">{product.partNumber}</span></p>}
              {product.crossReference.length > 0 && (
                <p>Cross-reference: <span className="font-mono">{product.crossReference.join(", ")}</span></p>
              )}
            </div>
          )}

          {product.compatibility.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold mb-2">Fits these vehicles</h2>
              <ul className="text-sm text-gray-700 space-y-1">
                {product.compatibility.map((c, i) => (
                  <li key={i} className="border-b border-gray-100 pb-1">
                    {c.vehicle.manufacturer} {c.vehicle.model} ({c.vehicle.yearStart}
                    {c.vehicle.yearEnd ? `–${c.vehicle.yearEnd}` : "+"})
                    {c.vehicle.engine && ` · ${c.vehicle.engine}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            disabled={product.quantity === 0}
            className="w-full mt-6 bg-gray-900 text-white rounded py-3 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {product.quantity > 0 ? "Add to cart" : "Out of stock"}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">Cart functionality coming next</p>
        </div>
      </div>

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <div className="mt-16 max-w-2xl">
          <h2 className="text-xl font-bold mb-4">Reviews</h2>
          <div className="space-y-4">
            {product.reviews.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded p-4">
                <span className="text-sm font-medium">★ {r.rating}/5</span>
                {r.comment && <p className="text-sm text-gray-700 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}