// Next.js shows this automatically the instant a product Link is clicked,
// before the server has even fetched the product — that's the whole point:
// with no feedback at all here, a click looked like it "didn't take" on
// anything slower than an instant response. Shaped like the real page
// (gallery left, details right) so there's no layout jump when it swaps in.
export default function ProductLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-4 w-28 bg-steel-light rounded" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
        <div className="aspect-square bg-steel-light rounded-lg" />

        <div>
          <div className="h-3 w-32 bg-steel-light rounded" />
          <div className="h-7 w-3/4 bg-steel-light rounded mt-3" />
          <div className="h-8 w-24 bg-steel-light rounded mt-4" />
          <div className="h-4 w-20 bg-steel-light rounded mt-4" />
          <div className="space-y-2 mt-5">
            <div className="h-4 w-full bg-steel-light rounded" />
            <div className="h-4 w-full bg-steel-light rounded" />
            <div className="h-4 w-2/3 bg-steel-light rounded" />
          </div>
          <div className="h-12 w-full bg-steel-light rounded-lg mt-6" />
        </div>
      </div>
    </main>
  );
}
