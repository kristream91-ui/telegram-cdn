"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import Icon from "./Icon";
import { loadUser, logout as clearUser } from "@/lib/api";

const LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/downloads", label: "Downloads", icon: "download" },
  { href: "/settings", label: "Settings", icon: "sliders" },
  { href: "/schedule", label: "Schedule & News", icon: "calendar" },
];

export default function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [who, setWho] = useState<string | null>(null);
  useEffect(() => { setWho(loadUser()?.name || null); }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-[rgba(2,4,10,.76)] backdrop-blur-md" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 top-0 flex w-[min(336px,88vw)] flex-col
                        border-l border-line bg-[rgba(6,11,24,.97)] px-4 pb-6 pt-4
                        shadow-[-24px_0_70px_rgba(0,0,0,.7)] backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <Logo size={36} />
          <button className="icon-btn h-9 w-9" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="hairline mb-3" />

        <div className="grad-frame mb-3">
          <div className="flex items-center gap-3 bg-panel/90 p-3">
            <span className="relative flex h-11 w-11 flex-none items-center justify-center rounded-full
                             bg-logo-grad text-[#02121f] shadow-[0_0_18px_rgba(12,132,252,.5)]">
              <Icon name="user" size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[15px] font-semibold">{who || "Guest"}</span>
              <span className="block text-[11.5px] text-muted">
                {who ? "Signed in · progress syncing" : "Sign in to sync progress"}
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
        </div>

        <nav className="flex flex-col gap-0.5 py-1">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} onClick={onClose}
              className="group flex items-center gap-3 rounded-xl px-3 py-3 text-[13.5px] font-medium
                         transition duration-200 hover:translate-x-1 hover:bg-panel2/60 hover:text-cyan">
              <Icon name={l.icon} size={17} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hairline mt-2" />
        <p className="px-3 pt-3 text-[11.5px] leading-relaxed text-muted">
          <span className="font-display font-semibold italic text-accent">ANI77</span> · Cosmic Anime World
          <br />Powered by Telegram — nothing is re-hosted.
        </p>
      </aside>
    </div>
  );
}
