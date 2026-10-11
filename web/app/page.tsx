"use client";
import { useEffect, useMemo, useState } from "react";
import Hero from "@/components/Hero";
import Row from "@/components/Row";
import MediaCard from "@/components/MediaCard";
import SeriesCard from "@/components/SeriesCard";
import Icon from "@/components/Icon";
import { getFiles, getProgress, getSeries, loadUser } from "@/lib/api";
import { buildSeries } from "@/lib/series";
import type { MediaFile, Progress, SeriesMeta, SessionUser } from "@/lib/types";

export default function HomePage() {
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [meta, setMeta] = useState<SeriesMeta[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [f, s] = await Promise.all([getFiles(), getSeries()]);
        if (!alive) return;
        setFiles(f);
        setMeta(s);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    const u = loadUser();
    setUser(u);
    if (u) getProgress(u.tok).then(setProgress).catch(() => {});
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => buildSeries(files || [], meta), [files, meta]);
  const metaOf = (name: string) => meta.find(s => s.name === name);
  const shown = files || [];
  const shownSeries = groups;
  const standalone = shown.filter(f => !f.series);
  const progressOf = (uuid: string) => progress[uuid] || null;
  const watching = (files || []).filter(f => {
    const p = progressOf(f.uuid);
    return p && p.pos > 10 && p.pos < p.dur - 30;
  });

  if (error) {
    return (
      <div className="mx-auto max-w-[560px] px-[4vw] py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl
                        border border-line bg-panel2 text-accent"><Icon name="alert" size={34} /></div>
        <h2 className="font-display text-3xl tracking-wide">Couldn&apos;t reach the server</h2>
        <p className="mt-2 text-[13.5px] text-muted">
          {error} — the free server may be waking up. Give it a few seconds and retry.
        </p>
        <button className="btn-ghost mt-5" onClick={() => location.reload()}>
          <Icon name="check" size={15} /> Retry
        </button>
      </div>
    );
  }

  if (files === null) {
    return (
      <div className="mx-auto max-w-[1240px] px-[4vw] py-24 text-center text-muted">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-blue-2" />
        <p className="mt-4 text-[13.5px]">Loading the library…</p>
      </div>
    );
  }

  if (!files.length) {
    return (
      <Hero slides={[]} featured={null} metaOf={metaOf} progressOf={progressOf} />
    );
  }

  const heroSlides = shownSeries.filter(s => s.banner);
  const featured = shown.find(f => f.has_thumb) || shown[0];

  return (
    <>
      <Hero slides={heroSlides} featured={featured} metaOf={metaOf} progressOf={progressOf} />

      {user && watching.length > 0 && (
        <Row title="Continue Watching" count={watching.length}>
          {watching.map(f => <MediaCard key={f.uuid} f={f} progress={progressOf(f.uuid)} />)}
        </Row>
      )}

      {shown.length > 0 && (
        <Row title="Recently Added" count={shown.length}>
          {shown.slice(0, 14).map(f => <MediaCard key={f.uuid} f={f} progress={progressOf(f.uuid)} />)}
        </Row>
      )}

      {shownSeries.length > 0 && (
        <section className="my-6 animate-rise px-[4vw]">
          <h2 className="flex items-baseline gap-3 pb-3 font-display text-[22px] tracking-[1.5px]">
            Series
            <span className="font-sans text-xs font-normal text-muted">{shownSeries.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {shownSeries.map(s => <SeriesCard key={s.name} s={s} />)}
          </div>
        </section>
      )}

      {standalone.length > 0 && (
        <section className="my-6 animate-rise px-[4vw]">
          <h2 className="flex items-baseline gap-3 pb-3 font-display text-[22px] tracking-[1.5px]">
            Movies &amp; More
            <span className="font-sans text-xs font-normal text-muted">{standalone.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {standalone.map(f => (
              <div key={f.uuid} className="[&>a]:w-full"><MediaCard f={f} progress={progressOf(f.uuid)} /></div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
