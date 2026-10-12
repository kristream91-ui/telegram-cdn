"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Player from "@/components/Player";
import Icon from "@/components/Icon";
import { CardSkeleton } from "@/components/Skeleton";
import { downloadUrl, getFile, getFiles, streamUrl, thumbUrl } from "@/lib/api";
import { useProgress, useUser } from "@/lib/useProgress";
import { fmtSize } from "@/lib/format";
import type { MediaFile } from "@/lib/types";

const clean = (n?: string) => String(n || "").replace(/\.[a-z0-9]+$/i, "");

export default function WatchPage() {
  const params = useParams<{ uuid: string }>();
  const uuid = String(params?.uuid || "");
  const [user] = useUser();
  const { map, save } = useProgress(user);

  const [file, setFile] = useState<MediaFile | null>(null);
  const [all, setAll] = useState<MediaFile[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!uuid) return;
    let alive = true;
    setLoading(true);
    Promise.all([getFile(uuid), getFiles()])
      .then(([f, list]) => { if (alive) { setFile(f); setAll(list); setLoading(false); } })
      .catch(e => { if (alive) { setErr((e as Error).message); setLoading(false); } });
    return () => { alive = false; };
  }, [uuid]);

  const siblings = useMemo(() => {
    if (!file?.series) return [];
    return all.filter(f => f.series === file.series)
      .sort((a, b) => (a.season - b.season) || (a.episode - b.episode));
  }, [file, all]);

  const idx = siblings.findIndex(f => f.uuid === uuid);
  const next = idx >= 0 ? siblings[idx + 1] : undefined;
  const prev = idx > 0 ? siblings[idx - 1] : undefined;
  const startPos = map[uuid]?.pos || 0;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(streamUrl(uuid));
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-[4vw] pt-2">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="skeleton aspect-video w-full rounded-2xl" />
            <div className="skeleton mt-4 h-8 w-[65%] rounded-lg" />
            <div className="mt-3 flex gap-2">
              <div className="skeleton h-6 w-28 rounded-full" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton aspect-video w-[96px] flex-none rounded-xl" />
                <div className="flex-1"><div className="skeleton h-3 w-[80%] rounded-md" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (err || !file) {
    return (
      <div className="mx-auto max-w-[520px] px-[4vw] py-24 text-center">
        <div className="grad-frame mx-auto mb-5 h-16 w-16">
          <div className="flex h-full w-full items-center justify-center bg-panel text-gold">
            <Icon name="alert" size={30} />
          </div>
        </div>
        <h2 className="font-display text-3xl font-semibold italic tracking-wide">Video not found</h2>
        <p className="mt-2 text-[13.5px] text-muted">{err || "This file may have been removed."}</p>
        <Link className="btn-ghost mt-5" href="/"><Icon name="arrowL" size={15} /> Back home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-[4vw] pb-10">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        <Link href="/" className="flex items-center gap-1.5 hover:text-ink"><Icon name="arrowL" size={14} /> Home</Link>
        {file.series && (
          <>
            <span className="opacity-50">/</span>
            <Link href={`/series/${encodeURIComponent(file.series)}`} className="hover:text-ink">{file.series}</Link>
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <Player file={file} next={next} startPos={startPos} onSave={save}
            onEnded={() => { if (next) location.href = `/watch/${next.uuid}`; }} />

          <h1 className="mt-5 font-display text-[clamp(23px,5vw,38px)] font-bold italic leading-tight tracking-[0.5px]">
            <span className="text-grad">{clean(file.name)}</span>
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {file.series && <span className="pill text-accent">{file.series}</span>}
            {file.episode ? <span className="pill">S{file.season || 1} · E{file.episode}</span> : null}
            <span className="pill">{/mp2t/i.test(file.mime || "") || /\.ts$/i.test(file.name) ? "TS stream" : "Telegram"}</span>
            {file.size ? <span className="text-[12px] text-muted">{fmtSize(file.size)}</span> : null}
            {file.codecs ? <span className="text-[12px] text-muted">· {file.codecs}</span> : null}
          </div>

          {file.caption && (
            <p className="mt-3 max-w-[860px] text-[13.5px] leading-relaxed text-[#c6d4ea]">{file.caption}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <a className="btn-primary" href={downloadUrl(file.uuid)} target="_blank" rel="noreferrer">
              <Icon name="download" size={15} /> Download
            </a>
            <button className="btn-ghost" onClick={copyLink}>
              <Icon name={copied ? "check" : "link"} size={15} /> {copied ? "Copied" : "Copy link"}
            </button>
            {prev && <Link className="btn-ghost" href={`/watch/${prev.uuid}`}><Icon name="arrowL" size={15} /> Previous</Link>}
            {next && <Link className="btn-ghost" href={`/watch/${next.uuid}`}><Icon name="next" size={15} /> Next</Link>}
          </div>
        </div>

        {siblings.length > 1 && (
          <aside className="lg:pt-1">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-5 w-1 rounded-full bg-logo-grad shadow-[0_0_12px_rgba(34,224,255,.65)]" />
              <h2 className="font-display text-[20px] font-semibold tracking-[1px]">Episodes</h2>
              <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-muted">{siblings.length}</span>
            </div>
            <div className="grid max-h-[560px] gap-2 overflow-y-auto pr-1">
              {siblings.map((s, i) => {
                const here = s.uuid === uuid;
                const p = map[s.uuid];
                const pct = p && p.dur ? Math.min(100, (p.pos / p.dur) * 100) : 0;
                return (
                  <Link key={s.uuid} href={`/watch/${s.uuid}`}
                    className={`flex items-center gap-3 rounded-2xl border p-2 transition
                      ${here ? "border-blue/60 bg-panel2" : "border-line bg-panel/60 hover:border-blue/40 hover:bg-panel2/70"}`}>
                    <span className="relative aspect-video w-[96px] flex-none overflow-hidden rounded-xl bg-panel2">
                      {s.has_thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl(s.uuid)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : null}
                      {pct > 0 && (
                        <i className="absolute inset-x-0 bottom-0 h-1 bg-logo-grad" style={{ width: pct + "%" }} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{clean(s.name)}</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted">
                        {s.episode ? `E${s.episode}` : `#${i + 1}`}{here ? " · now playing" : ""}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
