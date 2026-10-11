"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const TABS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/schedule", label: "Schedule", icon: "calendar" },
  { href: "/settings", label: "More", icon: "sliders" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[55] flex border-t border-line bg-[rgba(7,13,26,.98)]
                    px-1 pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5
                    shadow-[0_-8px_30px_rgba(0,0,0,.5)] md:hidden">
      {TABS.map(t => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-[10px] px-1 py-1.5
              ${active ? "bg-gold/10 text-gold" : "text-muted"}`}>
            <Icon name={t.icon} size={21} />
            <span className="text-[10.5px] font-semibold tracking-wide">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
