// Loading placeholders shaped like the content they stand in for, shown by
// NavigationSkeleton while the next page loads (instead of a spinner). Same
// proportions as the real components, so nothing jumps when content lands.
// Purely visual: hidden from screen readers (NavigationSkeleton announces
// "loading" once instead).

function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-card">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2.5 p-3.5 sm:p-4">
        <Bar className="h-4 w-[85%]" />
        <Bar className="h-3.5 w-[60%]" />
        <Bar className="h-3 w-[45%]" />
        <div className="flex items-center justify-between pt-2">
          <Bar className="h-5 w-24" />
          <Bar className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// /products, search, category / brand / truck pages, Find My Part results —
// same layout as CatalogView (trail, heading + sort, filter sidebar, grid).
export function CatalogSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-5">
      <Bar className="h-3.5 w-48" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Bar className="h-9 w-64" />
          <Bar className="h-4 w-52" />
        </div>
        <Bar className="h-11 w-48" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-7">
        <Bar className="h-11 w-full lg:hidden" />
        <div className="hidden lg:flex w-64 shrink-0 flex-col gap-5 rounded-[14px] border border-line bg-card p-[18px]">
          {[5, 4, 2].map((rows, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <Bar className="h-5 w-24" />
              {Array.from({ length: rows }, (_, j) => (
                <Bar key={j} className="h-4 w-[70%]" />
              ))}
            </div>
          ))}
          <Bar className="h-11 w-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// /find-my-part — title, then the grid of make tiles.
export function FindMyPartSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      <Bar className="h-10 w-80 max-w-full mb-3" />
      <Bar className="h-5 w-96 max-w-full mb-8" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex h-[92px] flex-col justify-center gap-2 rounded-[14px] border border-line bg-card p-4">
            <Bar className="h-6 w-[70%]" />
            <Bar className="h-4 w-[40%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// /products/<slug> — same grid as the page: photo + title, buy box on the
// right (first below them on phones), then the dark fit-check box.
export function ProductPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
      <Bar className="h-3.5 w-64 mb-5" />
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="skeleton aspect-square rounded-[14px]" />
          <div className="flex flex-col gap-3">
            <Bar className="h-4 w-36" />
            <Bar className="h-9 w-[90%]" />
            <Bar className="h-9 w-[60%]" />
            <div className="mt-2 flex flex-col gap-2">
              <Bar className="h-4 w-[70%]" />
              <Bar className="h-4 w-[55%]" />
              <Bar className="h-4 w-[40%]" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3.5 self-start rounded-[14px] border border-line bg-card p-5 sm:p-6 lg:row-span-2">
          <Bar className="h-9 w-44" />
          <Bar className="h-6 w-24 rounded-full" />
          <Bar className="h-[52px] w-full" />
          <Bar className="h-[52px] w-full" />
        </div>
        <div className="rounded-[14px] bg-ink/90 p-5 sm:p-6 flex flex-col gap-3.5">
          <div className="h-7 w-56 rounded-lg bg-ink-soft motion-safe:animate-pulse" />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-12 rounded-[10px] bg-ink-soft motion-safe:animate-pulse" />
            <div className="h-12 rounded-[10px] bg-ink-soft motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Everything else (cart, checkout, orders, account, about, forms…).
export function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-4">
      <Bar className="h-9 w-72" />
      <Bar className="h-4 w-[80%]" />
      <Bar className="h-4 w-[60%]" />
      <Bar className="h-40 w-full mt-4 rounded-[14px]" />
      <Bar className="h-24 w-full rounded-[14px]" />
    </div>
  );
}
