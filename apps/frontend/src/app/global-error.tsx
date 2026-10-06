"use client";
import { reportError } from "@/lib/report-error";
import { useEffect } from "react";
import "./globals.css";

// Last-resort screen when rendering crashes outside any other error
// boundary: report it, and give the visitor a way forward instead of a
// blank page. Bilingual because the locale may be what broke.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-paper text-ink flex items-center justify-center px-4 text-center font-sans">
        <main>
          <h1 className="text-2xl font-bold mb-2">Une erreur s&apos;est produite · Something went wrong</h1>
          <p className="text-steel mb-6">Réessayez dans un instant. · Please try again in a moment.</p>
          <div className="flex justify-center gap-3">
            <button onClick={reset} className="bg-amber text-ink px-5 py-2.5 text-sm font-semibold">Réessayer · Try again</button>
            {/* A full page load on purpose: the app crashed, so leave its state behind. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/fr" className="border border-steel-light px-5 py-2.5 text-sm font-semibold">Accueil · Home</a>
          </div>
        </main>
      </body>
    </html>
  );
}
