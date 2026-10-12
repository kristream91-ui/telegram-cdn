"use client";
import { useRef, type ReactNode } from "react";
import Icon from "./Icon";

export default function Row({ title, count, children }: {
  title: string; count?: number; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="relative my-6 animate-rise">
      <div className="flex items-center gap-2.5 px-[4vw] pb-3">
        <span className="h-5 w-1 rounded-full bg-logo-grad shadow-[0_0_12px_rgba(34,224,255,.65)]" />
        <h2 className="font-display text-[21px] font-semibold tracking-[1px]">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-muted">{count}</span>
        )}
      </div>
      <div className="group relative">
        <button onClick={() => scroll(-1)} aria-label="Scroll left"
          className="absolute inset-y-0 left-0 z-10 hidden w-11 items-center justify-center
                     bg-gradient-to-r from-[rgba(4,7,15,.9)] to-transparent text-white opacity-0
                     transition hover:text-cyan group-hover:opacity-100 md:flex">
          <Icon name="chevL" size={22} />
        </button>
        <div ref={ref} className="h-scroll">{children}</div>
        <button onClick={() => scroll(1)} aria-label="Scroll right"
          className="absolute inset-y-0 right-0 z-10 hidden w-11 items-center justify-center
                     bg-gradient-to-l from-[rgba(4,7,15,.9)] to-transparent text-white opacity-0
                     transition hover:text-cyan group-hover:opacity-100 md:flex">
          <Icon name="chevR" size={22} />
        </button>
      </div>
    </section>
  );
}
