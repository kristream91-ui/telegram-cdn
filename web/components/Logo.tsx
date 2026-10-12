"use client";
import { API_BASE } from "@/lib/api";

/** The Ani77 mark: the logo inside a slow rotating neon ring, with the
 *  wordmark where "77" is a blue→cyan gradient, italic — like the artwork. */
export default function Logo({ size = 42, withWord = true, className = "" }: {
  size?: number; withWord?: boolean; className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative flex-none" style={{ width: size, height: size }}>
        <span
          aria-hidden
          className="absolute -inset-[3px] animate-spinSlow rounded-full opacity-70 blur-[3px]"
          style={{ background: "conic-gradient(from 0deg,#22e0ff,#0c84fc,#0c2454,#22e0ff)" }}
        />
        <span aria-hidden
          className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(34,224,255,.35),transparent_70%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${API_BASE}/static/logo.webp`} alt="Ani77"
          className="relative h-full w-full rounded-full object-cover ring-1 ring-cyan/40" />
      </span>
      {withWord && (
        <span className="font-display text-[25px] font-bold italic leading-none tracking-[0.5px]">
          <span className="text-white">ANI</span>
          <span className="bg-gradient-to-r from-blue-2 to-cyan bg-clip-text text-transparent">77</span>
        </span>
      )}
    </span>
  );
}
