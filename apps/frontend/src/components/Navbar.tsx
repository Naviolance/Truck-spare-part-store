"use client";
import NextLink from "next/link";
import { Link as LocaleLink, usePathname } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { announceNavigation } from "@/lib/navigation-events";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { AuthModal } from "@/components/AuthModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
      )}
    </svg>
  );
}

// The admin is outside the /fr|/en segment: a locale-aware link would
// produce /en/admin (a 404). Everything else gets the locale prefix.
type LinkProps = Omit<React.ComponentProps<"a">, "href"> & { href: string };
function Link({ href, ...props }: LinkProps) {
  return href.startsWith("/admin") ? <NextLink href={href} {...props} /> : <LocaleLink href={href} {...props} />;
}

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`text-base py-1 transition-colors duration-200 ${active ? "text-amber font-semibold" : "text-paper hover:text-amber"}`}
    >
      {children}
    </Link>
  );
}

// The browse row under the header: Find My Part first (the store's best
// tool), trucks, the biggest categories, then everything.
function Chip({ href, children, accent = false }: { href: string; children: React.ReactNode; accent?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${
        active ? "bg-amber text-ink" : accent ? "bg-amber/15 text-amber hover:bg-amber/25" : "bg-ink-soft text-paper hover:bg-[#3A3631]"
      }`}
    >
      {children}
    </Link>
  );
}

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

// Site-wide search → /products?search=…, without a full page load (and
// with the catalog skeleton while results load). Works without JavaScript
// too, as a plain GET form.
function SearchForm() {
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const router = useRouter();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("search") ?? "").trim();
    if (!q) return;
    const href = `/${locale}/products?search=${encodeURIComponent(q)}`;
    announceNavigation(href);
    router.push(href);
  }
  return (
    <form
      role="search"
      action={`/${locale}/products`}
      method="get"
      onSubmit={submit}
      className="flex h-11 w-full overflow-hidden rounded-xl border-2 border-amber bg-card focus-within:ring-2 focus-within:ring-amber/50"
    >
      <label htmlFor="site-search" className="sr-only">
        {t("searchLabel")}
      </label>
      {/* Fallback renders before the URL is known (static rendering). */}
      <Suspense fallback={<SearchInput placeholder={t("searchPlaceholder")} />}>
        <CurrentSearchInput placeholder={t("searchPlaceholder")} />
      </Suspense>
      <button type="submit" className="flex items-center gap-2 bg-amber px-4 font-bold text-ink transition-colors hover:bg-[#D9932C]">
        <SearchIcon />
        <span className="hidden sm:inline">{t("searchButton")}</span>
      </button>
    </form>
  );
}

function SearchInput({ placeholder, value }: { placeholder: string; value?: string }) {
  return (
    <input
      id="site-search"
      name="search"
      type="search"
      enterKeyHint="search"
      placeholder={placeholder}
      defaultValue={value}
      className="min-w-0 flex-1 bg-transparent px-4 text-base text-ink placeholder:text-steel focus:outline-none"
    />
  );
}

// On the results page the box shows what was searched, so it can be edited.
function CurrentSearchInput({ placeholder }: { placeholder: string }) {
  const pathname = usePathname();
  const search = useSearchParams().get("search");
  const value = pathname === "/products" ? (search ?? "") : "";
  return <SearchInput key={value} placeholder={placeholder} value={value} />;
}

function TruckLogo() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber text-ink" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h11v9H3z" />
        <path d="M14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </svg>
    </span>
  );
}

const iconButton =
  "relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-paper transition-colors duration-150 hover:bg-ink-soft hover:text-amber";

export type NavCategory = { slug: string; label: string };

export function Navbar({ categories = [] }: { categories?: NavCategory[] }) {
  const { user, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const t = useTranslations("Navbar");
  const isCustomer = !loading && user && user.role !== "ADMIN";

  const cartLink = (
    <Link href="/cart" className={iconButton} aria-label={itemCount > 0 ? `${t("cart")} (${itemCount})` : t("cart")}>
      <CartIcon />
      {itemCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber px-1 text-[11px] font-bold text-ink">
          {itemCount}
        </span>
      )}
    </Link>
  );

  return (
    <nav aria-label={t("mainNav")} className="sticky top-0 z-40 bg-ink border-b-[3px] border-amber">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-3">
          <Link href="/" className="flex items-center gap-2 font-display text-[26px] font-bold leading-none text-paper transition-colors hover:text-amber">
            <TruckLogo />
            TruckParts
          </Link>

          <div className="order-last basis-full md:order-none md:basis-auto md:flex-1">
            <SearchForm />
          </div>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <LanguageSwitcher className="mr-1 hidden md:inline-flex" />
            {loading ? null : user ? (
              <>
                {isCustomer && cartLink}
                <Link
                  href={user.role === "ADMIN" ? "/admin" : "/account"}
                  className={`${iconButton} hidden md:inline-flex`}
                  aria-label={user.role === "ADMIN" ? t("adminDashboard") : t("account")}
                  title={user.role === "ADMIN" ? `${t("hiUser", { name: user.firstName })} — ${t("dashboard")}` : t("hiUser", { name: user.firstName })}
                >
                  <ProfileIcon />
                </Link>
                <button onClick={logout} className={`${iconButton} hidden md:inline-flex hover:text-rust`} aria-label={t("logout")} title={t("logout")}>
                  <LogoutIcon />
                </button>
              </>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="btn-primary ml-1 hidden md:inline-flex">
                {t("login")}
              </button>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`${iconButton} md:hidden`}
              aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
              aria-expanded={menuOpen}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>

        <div aria-label={t("browse")} role="group" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          <Chip href="/find-my-part" accent>
            {t("findMyPart")}
          </Chip>
          <Chip href="/trucks">{t("trucks")}</Chip>
          {categories.map((c) => (
            <Chip key={c.slug} href={`/categories/${c.slug}`}>
              {c.label}
            </Chip>
          ))}
          <Chip href="/products">{t("allParts")} →</Chip>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-paper/10 ${
          menuOpen ? "max-h-[28rem]" : "max-h-0 border-t-0"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
          <NavLink href="/about" onClick={closeMenu}>{t("about")}</NavLink>
          {loading ? null : user ? (
            <>
              {user.role !== "ADMIN" && <NavLink href="/orders" onClick={closeMenu}>{t("orders")}</NavLink>}
              <NavLink href={user.role === "ADMIN" ? "/admin" : "/account"} onClick={closeMenu}>
                {user.role === "ADMIN" ? t("dashboard") : t("hiUser", { name: user.firstName })}
              </NavLink>
              <button
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="text-left text-base py-1 text-paper-dim transition-colors duration-200 hover:text-rust"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                closeMenu();
                setAuthOpen(true);
              }}
              className="btn-primary w-fit"
            >
              {t("login")}
            </button>
          )}
          <LanguageSwitcher className="mt-1 w-fit" />
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </nav>
  );
}
