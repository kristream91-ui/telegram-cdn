"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { CardSkeleton } from "@/components/Skeleton";
import { downloadUrl, getFiles, streamUrl, thumbUrl } from "@/lib/api";
import { displayName, fmtSize } from "@/lib/format";
import type { MediaFile } from "@/lib/types";

type Sort = "recent" | "name" | "series";

export default function DownloadsPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>("recent");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getFiles().then(setFiles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? files.filter(f => (f.name || "").toLowerCase().includes(needle)
          || (f.series || "").toLowerCase().includes(needle))
      : files;
    const sorted = [...filtered];
    if (sort === "recent") sorted.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    if (sort === "name") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (sort === "series") sorted.sort((a, b) => (a.series || "~").localeCompare(b.series || "~")
      || (a.episode || 0) - (b.episode || 0));
    return sorted;
  }, [files, sort, q]);

  const totalBytes = files.reduce((n, f) => n + (f.size || 0), 0);

  const copy = async (uuid: string) => {
    const url = streamUrl(uuid);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(uuid);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-[4vw] pb-10">
      <div className="mb-4 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title">Downloads</h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {files.length} file{files.length === 1 ? "" : "s"}
            {totalBytes ? ` · ${fmtSize(totalBytes)}` : ""} · streamed from your Telegram bot
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([["recent", "Recent"], ["name", "A–Z"], ["series", "By series"]] as [Sort, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={`chip ${sort === k ? "chip-on" : ""}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="search" size={17} />
        </span>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Filter your files…" className="field pl-11" />
      </div>

      {loading && (
        <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} wide />)}
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-panel2 text-blue-2">
            <Icon name="download" size={30} />
          </div>
          <h2 className="font-display text-3xl tracking-wide">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-relaxed text-muted">
            Send an MP4 or TS file to the Ani77 Telegram bot and it will show up here, ready to
            stream or download.
          </p>
          <Link href="/" className="btn-primary mt-5">Back home</Link>
        </div>
      )}

      <div className="grid gap-2.5">
        {list.map(f => (
          <div key={f.uuid}
            className="flex items-center gap-3 rounded-2xl border border-line bg-panel/70 p-2.5 transition hover:border-blue/40">
            <Link href={`/watch/${f.uuid}`} className="relative aspect-video w-[112px] flex-none overflow-hidden rounded-xl bg-panel2 sm:w-[136px]">
              {f.has_thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(f.uuid)} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-blue-2/50">
                  <Icon name={f.series ? "tv" : "film"} size={26} />
                </span>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/watch/${f.uuid}`} className="block truncate text-[13.5px] font-semibold hover:text-accent">
                {displayName(f)}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {f.series && <span className="pill text-accent">{f.series}</span>}
                {f.episode ? <span className="pill">S{f.season || 1} · E{f.episode}</span> : null}
                <span className="text-[11.5px] text-muted">
                  {fmtSize(f.size)}{f.codecs ? ` · ${f.codecs}` : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-none items-center gap-2">
              <button className="icon-btn hidden sm:flex" aria-label="Copy stream link" onClick={() => copy(f.uuid)}>
                <Icon name={copied === f.uuid ? "check" : "link"} size={16} />
              </button>
              <a className="btn-ghost px-3 py-2" href={downloadUrl(f.uuid)} target="_blank" rel="noreferrer">
                <Icon name="download" size={15} />
                <span className="hidden sm:inline">Download</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {copied && (
        <div className="fixed inset-x-0 bottom-[92px] z-[60] flex justify-center">
          <span className="rounded-full border border-line bg-[rgba(8,18,40,.96)] px-4 py-2 text-[12.5px] text-accent shadow-soft">
            Stream link copied
          </span>
        </div>
      )}
    </div>
  );
}
