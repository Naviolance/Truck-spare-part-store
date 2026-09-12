import Link from "next/link";

// Placeholder targets ("#") until the client shares real account URLs -
// swap these once available, nothing else needs to change.
const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h3l1-3h-4V9c0-.6.4-1 1-1z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M20 12a8 8 0 1 1-3.8-6.8L20 4l-1.2 3.9A7.96 7.96 0 0 1 20 12Z" />
        <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.5 0 1-.6.5-1l-1-1.5-1.5.5c-.8-.5-1.6-1.2-2-2L11 9.5 9.5 8.5c-.4-.5-1-.2-1 .3v.7Z" />
      </svg>
    ),
  },
];

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
          <div className="flex items-center gap-3 mt-4">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="text-zinc-400 transition-colors duration-200 hover:text-zinc-900"
              >
                {social.icon}
              </a>
            ))}
          </div>
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
