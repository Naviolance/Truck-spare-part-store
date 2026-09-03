import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-4 gap-8">
        <div>
          <p className="font-bold text-lg text-zinc-900 tracking-tight">TruckParts</p>
          <p className="text-sm text-zinc-500 mt-2">
            Quality new and used truck spare parts, with vehicle compatibility lookup.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Shop</p>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li><Link href="/products" className="transition-colors duration-200 hover:text-zinc-900">All Parts</Link></li>
            <li><Link href="/find-my-part" className="transition-colors duration-200 hover:text-zinc-900">Find My Part</Link></li>
            <li><Link href="/cart" className="transition-colors duration-200 hover:text-zinc-900">Cart</Link></li>
            <li><Link href="/about" className="transition-colors duration-200 hover:text-zinc-900">About</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Account</p>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li><Link href="/login" className="transition-colors duration-200 hover:text-zinc-900">Log in</Link></li>
            <li><Link href="/register" className="transition-colors duration-200 hover:text-zinc-900">Create account</Link></li>
            <li><Link href="/orders" className="transition-colors duration-200 hover:text-zinc-900">Order history</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Visit us</p>
          <p className="text-sm text-zinc-600">
            Parts are viewed and picked up in person. Contact details are shared at checkout so you can
            confirm availability before you come by.
          </p>
        </div>
      </div>

      <div className="border-t border-zinc-100">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {year} TruckParts. All rights reserved.</p>
          <p>Prices shown in XAF.</p>
        </div>
      </div>
    </footer>
  );
}
