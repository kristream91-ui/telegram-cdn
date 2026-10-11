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
      <h2 className="flex items-baseline gap-3 px-[4vw] pb-3 font-display text-[22px] tracking-[1.5px]">
        {title}
        {count !== undefined && <span className="font-sans text-xs font-normal text-muted">{count}</span>}
      </h2>
      <div className="group relative">
        <button onClick={() => scroll(-1)} aria-label="Scroll left"
          className="absolute inset-y-0 left-0 z-10 hidden w-11 items-center justify-center md:flex
                     bg-gradient-to-r from-[rgba(5,10,20,.85)] to-transparent text-white opacity-0
                     transition hover:text-blue-2 group-hover:opacity-100">
          <Icon name="chevL" size={22} />
        </button>
        <div ref={ref} className="h-scroll">{children}</div>
        <button onClick={() => scroll(1)} aria-label="Scroll right"
          className="absolute inset-y-0 right-0 z-10 hidden w-11 items-center justify-center md:flex
                     bg-gradient-to-l from-[rgba(5,10,20,.85)] to-transparent text-white opacity-0
                     transition hover:text-blue-2 group-hover:opacity-100">
          <Icon name="chevR" size={22} />
        </button>
      </div>
    </section>
  );
}
