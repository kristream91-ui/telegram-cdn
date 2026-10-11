"use client";
import Link from "next/link";
import Icon from "./Icon";

const LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/schedule", label: "Schedule · Events & News", icon: "calendar" },
  { href: "/settings", label: "Downloads & Settings", icon: "download" },
];

export default function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-[rgba(2,5,10,.7)] backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 top-0 flex w-[min(320px,86vw)] flex-col gap-1.5
                        border-l border-line bg-panel px-4 pb-6 pt-4 shadow-[-18px_0_60px_rgba(0,0,0,.6)]">
        <div className="mb-2 flex items-center justify-between">
          <span className="bg-gradient-to-r from-blue-2 to-blue bg-clip-text font-display text-[26px]
                           tracking-wide text-transparent">Ani77</span>
          <button className="icon-btn h-9 w-9" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="h-px bg-line" />
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} onClick={onClose}
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-3 text-sm font-medium
                       transition hover:translate-x-1 hover:bg-panel2">
            <Icon name={l.icon} size={17} />
            {l.label}
          </Link>
        ))}
        <div className="h-px bg-line" />
        <p className="px-3 py-2 text-[12.5px] text-muted">
          Login, admin panel aur file tools agle stage me aa rahe hain.
        </p>
      </aside>
    </div>
  );
}
