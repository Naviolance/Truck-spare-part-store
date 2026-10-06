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

// /products/<slug>
export function ProductPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Bar className="h-3.5 w-56 mb-6" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="skeleton aspect-square rounded-[14px]" />
        <div className="flex flex-col gap-4">
          <Bar className="h-4 w-28 rounded-full" />
          <Bar className="h-9 w-[90%]" />
          <Bar className="h-4 w-48" />
          <Bar className="h-8 w-40 mt-2" />
          <Bar className="h-12 w-full mt-4" />
          <Bar className="h-12 w-full" />
          <div className="flex flex-col gap-2 mt-4">
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-[92%]" />
            <Bar className="h-3.5 w-[70%]" />
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
