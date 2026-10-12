"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const TABS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/downloads", label: "Downloads", icon: "download" },
  { href: "/settings", label: "Settings", icon: "sliders" },
];

export default function TabBar() {
  const path = usePathname();
  const isOn = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[55] md:hidden">
      <div className="h-px w-full bg-hairline opacity-70" />
      <div className="flex bg-[rgba(5,9,20,.9)] px-1.5 pb-[calc(7px+env(safe-area-inset-bottom,0px))] pt-1.5
                      shadow-[0_-14px_40px_rgba(1,4,12,.75)] backdrop-blur-2xl">
        {TABS.map(t => {
          const active = isOn(t.href);
          return (
            <Link key={t.href} href={t.href} className="flex flex-1 justify-center px-1 py-1">
              <span className={`flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 transition duration-200
                ${active
                  ? "bg-logo-grad-soft text-cyan shadow-[0_0_20px_rgba(34,224,255,.22)] ring-1 ring-cyan/30"
                  : "text-muted"}`}>
                <Icon name={t.icon} size={20} />
                <span className="text-[10px] font-semibold tracking-wide">{t.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
