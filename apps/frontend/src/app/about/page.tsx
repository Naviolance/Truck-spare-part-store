import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Who TruckParts is and how buying a part here works.",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wide mb-3">About us</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            A straightforward way to find truck parts that actually fit.
          </h1>
          <p className="text-zinc-300 mt-4 text-base sm:text-lg">
            We list new, used, and reconditioned parts with honest condition notes and vehicle
            compatibility up front, so you know what you're getting before you show up.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">How it works</h2>
          <p className="text-zinc-600">
            Every listing shows its condition (new, used, or reconditioned), part number, and which
            makes and models it fits — no guessing from a blurry photo. Use Find My Part to filter the
            catalogue down to your exact vehicle, or browse everything directly.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">Local pickup, not shipping</h2>
          <p className="text-zinc-600">
            We're a single-location operation — parts are viewed and picked up in person rather than
            shipped. Once your order is placed, contact details are shared so you can confirm
            availability and arrange pickup directly.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">Why the condition grading</h2>
          <p className="text-zinc-600">
            Not every part needs to be new to work well. Grading parts honestly as new, used, or
            reconditioned — with notes when something matters — means you can choose based on what
            your truck actually needs, not just what's cheapest or most convenient to list.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight mb-2">Looking for a part?</h2>
          <p className="text-zinc-500 text-sm mb-4">Search by your truck's manufacturer, model, and engine.</p>
          <Link
            href="/find-my-part"
            className="inline-block rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md"
          >
            Find My Part
          </Link>
        </div>
      </section>
    </main>
  );
}
