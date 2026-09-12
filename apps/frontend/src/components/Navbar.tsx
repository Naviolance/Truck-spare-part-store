"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`text-sm border-b-2 pb-0.5 transition-colors duration-200 ${
        active ? "text-paper border-amber font-medium" : "text-paper/70 border-transparent hover:text-paper"
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const t = useTranslations("Navbar");

  return (
    <nav className="sticky top-0 z-40 bg-ink border-b-2 border-amber">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="font-display font-black text-2xl text-paper tracking-tight transition-colors hover:text-amber">
            TruckParts
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="/find-my-part">{t("findMyPart")}</NavLink>
            <NavLink href="/products">{t("allParts")}</NavLink>
            <NavLink href="/about">{t("about")}</NavLink>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop right-side actions */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              {loading ? null : user ? (
                <>
                  {user.role !== "ADMIN" && (
                    <>
                      <Link href="/cart" className="relative text-paper/70 transition-colors duration-200 hover:text-paper" aria-label={t("cart")}>
                        <CartIcon />
                        {itemCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center bg-amber px-1 text-[10px] font-mono font-semibold text-ink">
                            {itemCount}
                          </span>
                        )}
                      </Link>
                      <NavLink href="/orders">{t("orders")}</NavLink>
                    </>
                  )}
                  <Link
                    href={user.role === "ADMIN" ? "/admin" : "/account"}
                    className="text-paper/70 transition-colors duration-200 hover:text-paper"
                    aria-label={user.role === "ADMIN" ? t("adminDashboard") : t("account")}
                    title={user.role === "ADMIN" ? `${t("hiUser", { name: user.firstName })} — ${t("dashboard")}` : t("hiUser", { name: user.firstName })}
                  >
                    <ProfileIcon />
                  </Link>
                  <button
                    onClick={logout}
                    className="text-paper/70 transition-colors duration-200 hover:text-rust"
                    aria-label={t("logout")}
                    title={t("logout")}
                  >
                    <LogoutIcon />
                  </button>
                </>
              ) : (
                <button onClick={() => setAuthOpen(true)} className="btn-primary">
                  {t("login")}
                </button>
              )}
              <LanguageSwitcher />
            </div>

            {/* Mobile: cart icon (customers only) + hamburger */}
            <div className="flex md:hidden items-center gap-4">
              {!loading && user && user.role !== "ADMIN" && (
                <Link href="/cart" className="relative text-paper/70" aria-label={t("cart")}>
                  <CartIcon />
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center bg-amber px-1 text-[10px] font-mono font-semibold text-ink">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="text-paper"
                aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
                aria-expanded={menuOpen}
              >
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-paper/10 ${
          menuOpen ? "max-h-96" : "max-h-0 border-t-0"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 text-sm">
          <NavLink href="/find-my-part" onClick={closeMenu}>{t("findMyPart")}</NavLink>
          <NavLink href="/products" onClick={closeMenu}>{t("allParts")}</NavLink>
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
                className="text-left text-paper/70 transition-colors duration-200 hover:text-rust"
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

          <LanguageSwitcher className="pt-2 border-t border-paper/10" />
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </nav>
  );
}
