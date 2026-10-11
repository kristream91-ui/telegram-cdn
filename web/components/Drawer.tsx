"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadUser, logout as clearUser } from "@/lib/api";
import Icon from "./Icon";

const LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/downloads", label: "Downloads", icon: "download" },
  { href: "/settings", label: "Settings", icon: "sliders" },
  { href: "/schedule", label: "Schedule & News", icon: "calendar" },
];

export default function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [who, setWho] = useState<string | null>(null);
  useEffect(() => {
    const u = loadUser();
    setWho(u?.name || null);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-[rgba(2,5,14,.72)] backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 top-0 flex w-[min(330px,88vw)] flex-col
                        border-l border-line bg-[rgba(6,13,32,.98)] px-4 pb-6 pt-4 shadow-[-20px_0_60px_rgba(0,0,0,.6)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[26px] tracking-[2px]">
            ANI<span className="text-accent">77</span>
          </span>
          <button className="icon-btn h-9 w-9" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-line bg-panel2/60 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-logo-grad text-white">
            <Icon name="user" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold">{who || "Guest"}</span>
            <span className="block text-[11.5px] text-muted">
              {who ? "Signed in" : "Sign in to sync progress"}
            </span>
          </span>
          {who ? (
            <button className="btn-quiet px-2.5 py-1.5 text-[12px]"
              onClick={() => { clearUser(); setWho(null); onClose(); }}>
              Log out
            </button>
          ) : (
            <Link href="/login" className="btn-primary px-3 py-1.5 text-[12px]" onClick={onClose}>
              Sign in
            </Link>
          )}
        </div>

        <div className="h-px bg-line" />
        <nav className="flex flex-col gap-0.5 py-2">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium
                         transition hover:translate-x-1 hover:bg-panel2/70">
              <Icon name={l.icon} size={17} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="h-px bg-line" />
        <p className="px-3 pt-3 text-[11.5px] leading-relaxed text-muted">
          Ani77 · Powered by Telegram (Pyrogram). Files stream straight from your own bot —
          nothing is re-hosted.
        </p>
      </aside>
    </div>
  );
}
