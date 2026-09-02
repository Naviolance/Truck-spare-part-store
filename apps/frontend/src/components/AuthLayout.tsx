"use client";
import Link from "next/link";
import Image from "next/image";
import { ReactNode, useState } from "react";

type Props = {
  mode: "login" | "register";
  children: ReactNode;
};

// Shared by /login and /register — same branded panel and shell on both
// pages so switching between them (via the toggle button below) feels like
// one continuous "auth card" changing state, not two unrelated pages, even
// though it's a real navigation under the hood.
export function AuthLayout({ mode, children }: Props) {
  const isLogin = mode === "login";
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl overflow-hidden shadow-lg flex flex-col sm:flex-row bg-white">
        {/* Branded panel — the engine photo shows here once
            apps/frontend/public/engine.jpg exists; until then (or if it
            fails to load) this gradient alone is the background, so
            nothing looks broken either way. */}
        <div className="relative sm:w-2/5 min-h-[220px] sm:min-h-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col justify-between p-8 text-white overflow-hidden">
          {!imageFailed && (
            <Image
              src="/engine.jpg"
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 40vw"
              className="object-cover opacity-40"
              onError={() => setImageFailed(true)}
            />
          )}

          <div className="relative">
            <p className="font-bold text-lg tracking-tight">TruckParts</p>
          </div>

          <div className="relative">
            <h2 className="text-2xl font-bold mb-2">
              {isLogin ? "Welcome back" : "Join TruckParts"}
            </h2>
            <p className="text-zinc-300 text-sm mb-6">
              {isLogin
                ? "Log in to pick up where you left off."
                : "Create an account to start browsing parts."}
            </p>
            <Link
              href={isLogin ? "/register" : "/login"}
              className="inline-block rounded-lg border border-white/30 px-4 py-2 text-sm transition-colors duration-200 hover:bg-white/10"
            >
              {isLogin ? "Create an account" : "Log in instead"}
            </Link>
          </div>
        </div>

        {/* Form panel */}
        <div className="sm:w-3/5 p-8">{children}</div>
      </div>
    </main>
  );
}
