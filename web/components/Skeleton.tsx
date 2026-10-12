/** Shimmer placeholders — a premium loading state instead of a bare spinner. */
export function CardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`${wide ? "w-full" : "w-[162px] flex-none md:w-[224px]"}`}>
      <div className="skeleton aspect-video w-full" />
      <div className="skeleton mt-2 h-3 w-[78%] rounded-md" />
      <div className="skeleton mt-1.5 h-2.5 w-[42%] rounded-md" />
    </div>
  );
}

export function RowSkeleton({ n = 6 }: { n?: number }) {
  return (
    <section className="my-6">
      <div className="flex items-center gap-2.5 px-[4vw] pb-3">
        <span className="h-5 w-1 rounded-full bg-logo-grad opacity-40" />
        <div className="skeleton h-4 w-40 rounded-md" />
      </div>
      <div className="h-scroll">
        {Array.from({ length: n }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section className="relative min-h-[62vh] px-[4vw] pb-10 pt-24 md:min-h-[82vh] md:pb-20">
      <div className="skeleton h-3 w-32 rounded-md" />
      <div className="skeleton mt-4 h-12 w-[70%] max-w-[520px] rounded-xl" />
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-6 w-24 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-3 w-[85%] max-w-[520px] rounded-md" />
      <div className="skeleton mt-2 h-3 w-[60%] max-w-[380px] rounded-md" />
      <div className="mt-6 flex gap-3">
        <div className="skeleton h-11 w-32 rounded-xl" />
        <div className="skeleton h-11 w-32 rounded-xl" />
      </div>
    </section>
  );
}
