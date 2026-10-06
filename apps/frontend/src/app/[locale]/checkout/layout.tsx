import type { Metadata } from "next";

// Private/transactional page: never in search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
