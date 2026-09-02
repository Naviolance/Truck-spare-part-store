import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "All Parts", template: "%s | TruckParts" },
  description: "Browse our full catalog of new, used, and reconditioned truck spare parts.",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
