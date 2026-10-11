"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import Icon from "./Icon";

/** Glass top bar. Search now lives on its own page, so the pill is a link. */
export default function Nav({ onMenu }: { onMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200
        ${scrolled ? "border-b border-line bg-[rgba(4,9,26,.9)] backdrop-blur-xl" : "bg-gradient-to-b from-[rgba(4,9,26,.95)] to-transparent"}`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-[4vw] py-2.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Ani77 home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${API_BASE}/static/logo.webp`} alt=""
            className="h-[42px] w-[42px] rounded-full object-cover
                       shadow-[0_0_0_2px_rgba(12,132,252,.45),0_0_20px_rgba(12,132,252,.35)]" />
          <span className="font-display text-[26px] leading-none tracking-[2px]">
            ANI<span className="text-accent">77</span>
          </span>
        </Link>

        {/* desktop search pill */}
        <button onClick={() => router.push("/search")}
          className="ml-4 hidden max-w-[420px] flex-1 items-center gap-2.5 rounded-full border border-line
                     bg-panel2/60 px-4 py-2.5 text-left text-[13.5px] text-muted transition
                     hover:border-blue/50 hover:bg-panel2 md:flex">
          <Icon name="search" size={16} />
          Search series, episodes, genres…
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" className="icon-btn md:hidden" aria-label="Search">
            <Icon name="search" size={17} />
          </Link>
          <button className="icon-btn" aria-label="Menu" onClick={onMenu}>
            <Icon name="menu" size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
