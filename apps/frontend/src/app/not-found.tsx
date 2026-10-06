import "./globals.css";

// Paths outside any locale (e.g. a mistyped /admin/xyz). Localized 404s
// come from app/[locale]/not-found.tsx.
//
// Kept deliberately tiny — no AppShell, no providers, no translation
// messages: Next embeds this component in EVERY page's payload as the
// not-found fallback, so anything heavy here is shipped to every visitor
// (it was sending the whole English message catalog with every French page).
// For the same reason it must not call setRequestLocale.
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-paper text-ink flex items-center justify-center px-4 text-center font-sans">
        <main>
          <p className="text-sm font-semibold uppercase tracking-wide text-steel mb-2">404</p>
          <h1 className="text-2xl font-bold mb-2">Page introuvable · Page not found</h1>
          <p className="text-steel mb-6">
            <a href="/fr" className="underline">Retour à l&apos;accueil</a> · <a href="/en" className="underline">Back to home</a>
          </p>
        </main>
      </body>
    </html>
  );
}
