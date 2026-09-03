"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

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
      className={`text-sm transition-colors duration-200 ${active ? "text-zinc-900 font-medium" : "text-zinc-600 hover:text-zinc-900"}`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="font-bold text-lg text-zinc-900 tracking-tight transition-colors hover:text-zinc-600">
            TruckParts
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="/find-my-part">Find My Part</NavLink>
            <NavLink href="/products">All Parts</NavLink>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop right-side actions */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              {loading ? null : user ? (
                <>
                  {user.role !== "ADMIN" && (
                    <>
                      <Link href="/cart" className="relative text-zinc-600 transition-colors duration-200 hover:text-zinc-900" aria-label="Cart">
                        <CartIcon />
                        {itemCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-medium text-white">
                            {itemCount}
                          </span>
                        )}
                      </Link>
                      <NavLink href="/orders">Orders</NavLink>
                    </>
                  )}
                  <Link
                    href="/account"
                    className="text-zinc-600 transition-colors duration-200 hover:text-zinc-900"
                    aria-label="Account"
                    title={`Hi, ${user.firstName}`}
                  >
                    <ProfileIcon />
                  </Link>
                  {user.role === "ADMIN" && <NavLink href="/admin">Admin</NavLink>}
                  <button
                    onClick={logout}
                    className="text-zinc-600 transition-colors duration-200 hover:text-red-600"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <LogoutIcon />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md"
                >
                  Log in
                </Link>
              )}
            </div>

            {/* Mobile: cart icon (customers only) + hamburger */}
            <div className="flex md:hidden items-center gap-4">
              {!loading && user && user.role !== "ADMIN" && (
                <Link href="/cart" className="relative text-zinc-600" aria-label="Cart">
                  <CartIcon />
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-medium text-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="text-zinc-700"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
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
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-zinc-100 ${
          menuOpen ? "max-h-96" : "max-h-0 border-t-0"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 text-sm">
          <NavLink href="/find-my-part" onClick={closeMenu}>Find My Part</NavLink>
          <NavLink href="/products" onClick={closeMenu}>All Parts</NavLink>

          {loading ? null : user ? (
            <>
              {user.role !== "ADMIN" && <NavLink href="/orders" onClick={closeMenu}>Orders</NavLink>}
              <NavLink href="/account" onClick={closeMenu}>{`Hi, ${user.firstName}`}</NavLink>
              {user.role === "ADMIN" && <NavLink href="/admin" onClick={closeMenu}>Admin</NavLink>}
              <button
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="text-left text-zinc-600 transition-colors duration-200 hover:text-red-600"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={closeMenu}
              className="inline-block w-fit rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
