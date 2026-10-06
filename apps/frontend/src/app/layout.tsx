// The real root layouts are app/[locale]/layout.tsx (storefront) and
// app/admin/layout.tsx — each renders its own <html> through AppShell. This
// pass-through exists because Next needs a top-level layout file.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
