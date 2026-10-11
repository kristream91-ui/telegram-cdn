"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Player from "@/components/Player";
import Icon from "@/components/Icon";
import { downloadUrl, getFile, getFiles, thumbUrl } from "@/lib/api";
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

  useEffect(() => {
    if (!uuid) return;
    let alive = true;
    setLoading(true);
    Promise.all([getFile(uuid), getFiles()])
      .then(([f, list]) => {
        if (!alive) return;
        setFile(f);
        setAll(list);
        setLoading(false);
      })
      .catch(e => { if (alive) { setErr((e as Error).message); setLoading(false); } });
    return () => { alive = false; };
  }, [uuid]);

  const siblings = useMemo(() => {
    if (!file?.series) return [];
    return all
      .filter(f => f.series === file.series)
      .sort((a, b) => (a.season - b.season) || (a.episode - b.episode));
  }, [file, all]);

  const idx = siblings.findIndex(f => f.uuid === uuid);
  const next = idx >= 0 ? siblings[idx + 1] : undefined;
  const prev = idx > 0 ? siblings[idx - 1] : undefined;
  const startPos = map[uuid]?.pos || 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1240px] px-[4vw] py-24 text-center text-muted">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-blue-2" />
        <p className="mt-4 text-[13.5px]">Loading…</p>
      </div>
    );
  }

  if (err || !file) {
    return (
      <div className="mx-auto max-w-[560px] px-[4vw] py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-panel2 text-gold">
          <Icon name="alert" size={32} />
        </div>
        <h2 className="font-display text-3xl tracking-wide">Video not found</h2>
        <p className="mt-2 text-[13.5px] text-muted">{err || "This episode may have been removed."}</p>
        <Link className="btn-ghost mt-5" href="/"><Icon name="arrowL" size={15} /> Back home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-[4vw] pb-10">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-muted">
        <Link href="/" className="flex items-center gap-1.5 hover:text-ink"><Icon name="arrowL" size={14} /> Home</Link>
        {file.series && (
          <>
            <span>/</span>
            <Link href={`/series/${encodeURIComponent(file.series)}`} className="hover:text-ink">{file.series}</Link>
          </>
        )}
      </div>

      <Player
        file={file}
        next={next}
        startPos={startPos}
        onSave={save}
        onEnded={() => { if (next) location.href = `/watch/${next.uuid}`; }}
      />

      <h1 className="mt-4 font-display text-[clamp(20px,5vw,34px)] leading-tight tracking-wide">
        {clean(file.name)}
      </h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        {file.series && <span className="pill text-gold">{file.series}</span>}
        {file.episode ? <span className="pill">S{file.season || 1} · E{file.episode}</span> : null}
        <span className="pill">{file.source === "youtube" ? "YouTube" : file.mime.includes("mp2t") ? "TS stream" : "Telegram"}</span>
        <span>{fmtSize(file.size)}</span>
      </div>
      {file.caption && <p className="mt-3 max-w-[820px] text-[13.5px] leading-relaxed text-[#c3cfe2]">{file.caption}</p>}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <a className="btn-ghost" href={downloadUrl(file.uuid)} target="_blank" rel="noreferrer">
          <Icon name="download" size={15} /> {file.source === "youtube" ? "Open on YouTube" : "Download"}
        </a>
        {prev && <Link className="btn-ghost" href={`/watch/${prev.uuid}`}><Icon name="arrowL" size={15} /> Previous</Link>}
        {next && <Link className="btn-primary" href={`/watch/${next.uuid}`}><Icon name="next" size={15} /> Next episode</Link>}
      </div>

      {siblings.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-baseline gap-3 font-display text-[20px] tracking-[1.5px]">
            Episodes <span className="font-sans text-xs font-normal text-muted">{siblings.length}</span>
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.map((s, i) => {
              const here = s.uuid === uuid;
              const p = map[s.uuid];
              const pct = p && p.dur ? Math.min(100, (p.pos / p.dur) * 100) : 0;
              return (
                <Link key={s.uuid} href={`/watch/${s.uuid}`}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 transition
                    ${here ? "border-blue/60 bg-panel2" : "border-line bg-panel hover:border-blue/40 hover:bg-panel2"}`}>
                  <span className="relative aspect-video w-[104px] flex-none overflow-hidden rounded-lg bg-panel2">
                    {s.has_thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl(s.uuid)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : null}
                    {pct > 0 && <i className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue to-blue-2" style={{ width: pct + "%" }} />}
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
        </section>
      )}
    </div>
  );
}
