import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-steel mb-2">404</p>
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">Page not found</h1>
        <p className="text-steel mb-8">The page you're looking for doesn't exist or may have moved.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="bg-amber text-ink px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-amber-dark"
          >
            Back to home
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-steel-light px-5 py-2.5 text-sm font-semibold text-steel transition-colors duration-200 hover:border-steel hover:text-ink"
          >
            Browse all parts
          </Link>
        </div>
      </div>
    </main>
  );
}
