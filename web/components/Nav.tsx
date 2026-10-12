"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import Icon from "./Icon";

export default function Nav({ onMenu }: { onMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300
      ${scrolled ? "border-b border-line bg-[rgba(4,7,15,.82)] backdrop-blur-2xl shadow-[0_10px_40px_rgba(1,4,12,.6)]"
                 : "bg-gradient-to-b from-[rgba(4,7,15,.9)] via-[rgba(4,7,15,.45)] to-transparent"}`}>
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-[4vw] py-3">
        <Link href="/" aria-label="Ani77 home" className="transition hover:opacity-90">
          <Logo size={40} />
        </Link>

        <button onClick={() => router.push("/search")}
          className="group ml-4 hidden max-w-[430px] flex-1 items-center gap-2.5 rounded-full border border-line
                     bg-panel2/40 px-4 py-2.5 text-left text-[13px] text-muted backdrop-blur
                     transition duration-200 hover:border-cyan/40 hover:bg-panel2/70 hover:shadow-[0_0_22px_rgba(34,224,255,.15)] md:flex">
          <Icon name="search" size={16} />
          <span className="flex-1">Search series, episodes, genres…</span>
          <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">⌘K</span>
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
      <div className={`h-px w-full bg-hairline transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`} />
    </header>
  );
}
