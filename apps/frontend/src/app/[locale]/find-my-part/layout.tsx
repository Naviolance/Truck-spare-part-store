import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find My Part",
  description: "Select your truck's manufacturer, model, and year to find parts that fit.",
};

export default function FindMyPartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
