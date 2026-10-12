"use client";
import { useRef, type ReactNode } from "react";
import Link from "next/link";
import Icon from "./Icon";

/** A content rail. Pass `banner` (a wide image url) to get the Moctale-style
 *  collection header: a landscape strip with the rail name laid over it. */
export default function Row({ title, count, banner, href, children }: {
  title: string;
  count?: number;
  banner?: string | null;
  href?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="relative my-7 animate-rise">
      {banner ? (
        <div className="px-[4vw] pb-3">
          <Link href={href || "#"} className="group relative block overflow-hidden rounded-2xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt="" loading="lazy"
              className="h-[142px] w-full object-cover object-[center_38%] transition duration-700 group-hover:scale-[1.03] md:h-[190px]" />
            {/* keep the artwork visible; just enough scrim for the copy */}
            <span className="absolute inset-0 bg-[linear-gradient(to_right,rgba(4,7,15,.86)_0%,rgba(4,7,15,.42)_48%,rgba(4,7,15,.04)_100%)]" />
            <span className="absolute inset-0 bg-[rgba(4,7,15,.18)]" />
            <span className="absolute inset-0 flex flex-col justify-center px-4 md:px-6">
              <span className="eyebrow [text-shadow:0_2px_12px_rgba(0,0,0,.95)]">{count !== undefined ? `${count} titles` : "Collection"}</span>
              <span className="mt-1 font-display text-[clamp(21px,4.8vw,36px)] font-bold italic leading-tight tracking-[0.5px]">
                <span className="text-grad [text-shadow:0_2px_16px_rgba(0,0,0,.95)]">{title}</span>
              </span>
            </span>
            <span className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center
                             rounded-full bg-logo-grad text-[#02121f] opacity-0 shadow-[0_0_24px_rgba(34,224,255,.5)]
                             transition group-hover:opacity-100">
              <Icon name="chevR" size={16} />
            </span>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-[4vw] pb-3">
          <span className="h-5 w-1 rounded-full bg-logo-grad shadow-[0_0_12px_rgba(34,224,255,.65)]" />
          <h2 className="font-display text-[21px] font-semibold tracking-[1px]">{title}</h2>
          {count !== undefined && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-muted">{count}</span>
          )}
          {href && (
            <Link href={href} className="ml-auto flex items-center gap-1 text-[12px] text-muted transition hover:text-cyan">
              See all <Icon name="chevR" size={13} />
            </Link>
          )}
        </div>
      )}

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
