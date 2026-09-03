import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-2">404</p>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">Page not found</h1>
        <p className="text-zinc-500 mb-8">The page you're looking for doesn't exist or may have moved.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md"
          >
            Back to home
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors duration-200 hover:border-zinc-400 hover:text-zinc-900"
          >
            Browse all parts
          </Link>
        </div>
      </div>
    </main>
  );
}
