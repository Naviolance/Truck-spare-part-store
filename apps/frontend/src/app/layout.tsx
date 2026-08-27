import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TruckParts — Truck Spare Parts Store",
  description: "Quality new and used truck spare parts, with vehicle compatibility lookup.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
