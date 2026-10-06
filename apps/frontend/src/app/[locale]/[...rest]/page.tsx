import { notFound } from "next/navigation";

// Any unknown path under /fr or /en renders the localized not-found page
// (app/[locale]/not-found.tsx) with a real 404 status.
export default function CatchAll() {
  notFound();
}
