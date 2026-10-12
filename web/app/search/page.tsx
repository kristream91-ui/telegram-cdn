"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Search and Explore are the same experience — keep the old path working. */
export default function SearchRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/explore"); }, [router]);
  return (
    <div className="mx-auto max-w-[520px] px-[4vw] py-24 text-center text-muted">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-cyan" />
      <p className="mt-4 text-[13.5px]">Opening Explore…</p>
    </div>
  );
}
