"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import Icon from "./Icon";

export default function Nav({
  query, setQuery, onMenu,
}: { query: string; setQuery: (v: string) => void; onMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex items-center gap-5 px-[4vw] transition-all duration-200
        ${scrolled ? "py-2 shadow-[0_1px_0_rgba(120,160,255,.10),0_8px_30px_rgba(0,0,0,.45)]" : "py-3"}
        bg-[rgba(5,10,20,.88)] backdrop-blur`}
    >
      <Link href="/" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${API_BASE}/static/logo.webp`} alt="Ani77"
          className="h-[52px] w-auto drop-shadow-[0_0_14px_rgba(0,174,239,.45)] transition hover:scale-105"
        />
      </Link>

      <div className="ml-auto flex gap-2">
        <button className="icon-btn" aria-label="Search" onClick={() => setOpen(v => !v)}>
          <Icon name="search" size={17} />
        </button>
        <button className="icon-btn" aria-label="Menu" onClick={onMenu}>
          <Icon name="menu" size={17} />
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full mx-[4vw] mt-2 flex items-center gap-2 rounded-full
                        border border-line bg-[rgba(11,21,38,.98)] px-4 py-2.5 text-muted shadow-soft">
          <Icon name="search" size={16} />
          <input
            autoFocus value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search series, genre, episode…"
            className="flex-1 border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-[#5c6b85]"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear" className="text-muted hover:text-ink">
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
