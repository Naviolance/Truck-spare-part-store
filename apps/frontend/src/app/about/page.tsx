import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Who TruckParts is and how buying a part here works.",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-ink to-ink text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-steel text-sm font-medium uppercase tracking-wide mb-3">About us</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            A straightforward way to find truck parts that actually fit.
          </h1>
          <p className="text-steel-light mt-4 text-base sm:text-lg">
            We list new, used, and reconditioned parts with honest condition notes and vehicle
            compatibility up front, so you know what you're getting before you show up.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div>
          <h2 className="text-xl font-display font-bold text-ink tracking-tight mb-2">How it works</h2>
          <p className="text-steel">
            Every listing shows its condition (new, used, or reconditioned), part number, and which
            makes and models it fits — no guessing from a blurry photo. Use Find My Part to filter the
            catalogue down to your exact vehicle, or browse everything directly.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-display font-bold text-ink tracking-tight mb-2">Local pickup, not shipping</h2>
          <p className="text-steel">
            We're a single-location operation — parts are viewed and picked up in person rather than
            shipped. Once your order is placed, contact details are shared so you can confirm
            availability and arrange pickup directly.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-display font-bold text-ink tracking-tight mb-2">Why the condition grading</h2>
          <p className="text-steel">
            Not every part needs to be new to work well. Grading parts honestly as new, used, or
            reconditioned — with notes when something matters — means you can choose based on what
            your truck actually needs, not just what's cheapest or most convenient to list.
          </p>
        </div>

        <div className="rounded-lg border border-steel-light bg-white p-6 text-center">
          <h2 className="text-lg font-display font-bold text-ink tracking-tight mb-2">Looking for a part?</h2>
          <p className="text-steel text-sm mb-4">Search by your truck's manufacturer, model, and engine.</p>
          <Link
            href="/find-my-part"
            className="inline-block bg-amber text-ink px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-amber-dark"
          >
            Find My Part
          </Link>
        </div>
      </section>
    </main>
  );
}
