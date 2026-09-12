import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { AddToCartButton } from "./AddToCartButton";
import { ReviewsSection } from "./ReviewsSection";
import { ProductGallery } from "./ProductGallery";
import { formatMoney } from "@/lib/money";
import { ConditionTag } from "@/components/ProductCard";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  descriptionFr: string | null;
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
  reviews: { id: string; rating: number; comment: string | null; userId: string; createdAt: string }[];
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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Product not found" };

  const locale = await getLocale();
  const description = (locale === "fr" && product.descriptionFr ? product.descriptionFr : product.description).slice(0, 160);
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description,
    openGraph: { title: product.name, description, images: image ? [image] : undefined },
    twitter: { title: product.name, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const locale = await getLocale();
  const displayDescription = locale === "fr" && product.descriptionFr ? product.descriptionFr : product.description;

  const avgRating =
    product.reviews.length > 0
      ? (product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1)
      : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <Link href="/products" className="text-sm text-steel transition-colors duration-200 hover:text-ink">
        &larr; Back to all parts
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
        {/* Images */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* Details */}
        <div>
          <p className="text-sm text-steel">
            {product.brand?.name ?? "Unbranded"} / {product.category.name}
          </p>
          <h1 className="text-2xl font-sans font-bold mt-1 text-ink tracking-tight">{product.name}</h1>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-2xl font-mono font-semibold text-ink">{formatMoney(product.price)}</span>
            <ConditionTag condition={product.condition} />
            {avgRating && (
              <span className="text-sm text-steel">★ {avgRating} ({product.reviews.length} review{product.reviews.length !== 1 ? "s" : ""})</span>
            )}
          </div>

          <p className={`text-sm mt-2 font-medium ${product.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
            {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
          </p>

          {product.conditionNotes && (
            <div className="mt-4 bg-amber/10 border-l-4 border-amber p-3 text-sm text-ink">
              <span className="font-medium">Condition notes: </span>
              {product.conditionNotes}
            </div>
          )}

          <p className="text-steel mt-4 whitespace-pre-line leading-relaxed">{displayDescription}</p>

          {(product.partNumber || product.crossReference.length > 0) && (
            <div className="mt-4 text-sm text-steel space-y-1">
              {product.partNumber && <p>Part number: <span className="font-mono">{product.partNumber}</span></p>}
              {product.crossReference.length > 0 && (
                <p>Cross-reference: <span className="font-mono">{product.crossReference.join(", ")}</span></p>
              )}
            </div>
          )}

          {product.compatibility.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display font-semibold mb-2 text-ink">Fits these vehicles</h2>
              <ul className="text-sm text-steel space-y-1">
                {product.compatibility.map((c, i) => (
                  <li key={i} className="border-b border-steel-light pb-1">
                    {c.vehicle.manufacturer} {c.vehicle.model} ({c.vehicle.yearStart}
                    {c.vehicle.yearEnd ? `–${c.vehicle.yearEnd}` : "+"})
                    {c.vehicle.engine && ` / ${c.vehicle.engine}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <AddToCartButton productId={product.id} inStock={product.quantity > 0} />
          </div>
        </div>
      </div>

      <ReviewsSection productId={product.id} initialReviews={product.reviews} />
    </main>
  );
}
