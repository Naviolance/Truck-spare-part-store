"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">TruckParts</Link>
        <div className="flex items-center gap-4 text-sm">
          {loading ? null : user ? (
            <>
                <span className="text-gray-600">Hi, {user.firstName}</span>
                {user.role === "ADMIN" && (
                <Link href="/admin" className="hover:underline">Admin</Link>
                )}
                <button onClick={logout} className="text-red-600 hover:underline">
                Log out
                </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">Log in</Link>
              <Link href="/register" className="hover:underline">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}