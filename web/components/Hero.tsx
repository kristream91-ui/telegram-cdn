"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MediaFile, SeriesGroup, SeriesMeta } from "@/lib/types";
import { bannerUrl, thumbUrl } from "@/lib/api";
import { displayName, fmtDur, fmtSize } from "@/lib/format";
import Icon from "./Icon";

/** Big hero: rotating banner slideshow when series have banners, else the
 *  newest featured file. Mirrors the look of the original vanilla build. */
export default function Hero({ slides, featured, metaOf, progressOf }: {
  slides: SeriesGroup[];
  featured?: MediaFile | null;
  metaOf: (name: string) => SeriesMeta | undefined;
  progressOf: (uuid: string) => { pos: number; dur: number } | null;
}) {
  const [cur, setCur] = useState(0);
  const multi = slides.length > 1;

  useEffect(() => {
    if (!multi) return;
    const t = setInterval(() => setCur(c => (c + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [multi, slides.length]);

  if (slides.length) {
    const s = slides[Math.min(cur, slides.length - 1)];
    const m = metaOf(s.name) || ({} as SeriesMeta);
    const cont = s.eps.find(e => {
      const p = progressOf(e.uuid);
      return p && p.pos > 10 && p.pos < p.dur - 30;
    });
    const first = cont || s.eps[0];
    const metaBits = [m.year, m.genre].filter(Boolean).join(" · ")
      || `${s.eps.length} episode${s.eps.length > 1 ? "s" : ""}`;

    return (
      <section className="relative flex min-h-[54vh] items-end overflow-hidden bg-bg2 pb-9 md:min-h-[74vh] md:pb-[70px]">
        {slides.map((sl, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={sl.name} src={bannerUrl(sl.name)} alt=""
            loading={i ? "lazy" : "eager"}
            className={`absolute inset-0 h-full w-full object-cover object-[center_20%] transition-opacity duration-700
              ${i === cur ? "opacity-85 animate-heroZoom" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#050a14_2%,rgba(5,10,20,.35)_45%,transparent_75%),linear-gradient(to_right,rgba(5,10,20,.92)_0%,rgba(5,10,20,.35)_45%,transparent_75%)]" />
        <div className="relative z-[2] max-w-[620px] px-[4vw]">
          <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[3px] text-blue-2">
            {cont ? `Resume · Episode ${cont.episode || "?"}` : "Featured Series"}
          </span>
          <h1 className="my-4 font-display text-[clamp(28px,8.5vw,72px)] leading-none tracking-wide
                         [text-shadow:0_4px_30px_rgba(0,0,0,.7)]">
            {s.name}
          </h1>
          <div className="text-[13px] text-muted">{metaBits}</div>
          <p className="clamp-3 mt-2 max-w-[520px] text-[13.5px] leading-relaxed text-[#d3ddec]">
            {m.description || "Streamed straight from the original source in original quality."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn-primary" href={`/watch/${first.uuid}`}>
              <Icon name="play" size={15} />
              {cont ? `Continue E${cont.episode || "?"}` : "Play E1"}
            </Link>
            <Link className="btn-ghost" href={`/series/${encodeURIComponent(s.name)}`}>
              <Icon name="chevR" size={15} /> All episodes
            </Link>
          </div>
          {multi && (
            <div className="absolute bottom-[-28px] right-[4vw] flex gap-2">
              {slides.map((sl, i) => (
                <button key={sl.name} aria-label={`Banner ${i + 1}`} onClick={() => setCur(i)}
                  className={`h-1 rounded transition-all ${i === cur ? "w-10 bg-gold" : "w-[26px] bg-white/25"}`} />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (!featured) {
    return (
      <section className="relative flex min-h-[54vh] items-center justify-center overflow-hidden bg-bg2 text-center md:min-h-[74vh]">
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#050a14_2%,rgba(5,10,20,.35)_45%,transparent_75%)]" />
        <div className="relative z-[2] max-w-[700px] px-[4vw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${process.env.NEXT_PUBLIC_API_BASE}/static/logo.webp`} alt="Ani77"
            className="mx-auto w-[124px] animate-floaty drop-shadow-[0_0_40px_rgba(0,174,239,.55)] md:w-[190px]" />
          <h1 className="mt-4 font-display text-[clamp(28px,8.5vw,64px)] tracking-wide">
            Stream Hindi Dub Anime
            <span className="ml-2.5 inline-block rounded-md bg-gradient-to-br from-[#f5a300] to-gold px-2.5 py-1 align-middle
                             text-[11px] font-bold tracking-[2px] text-[#241800]">FREE</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[520px] text-[13.5px] leading-relaxed text-[#d3ddec]">
            A hand-picked Hindi dub anime library. New episodes are added regularly — check back soon!
          </p>
          <Link href="/schedule" className="btn-gold mt-6">
            <Icon name="calendar" size={15} /> See the schedule
          </Link>
        </div>
      </section>
    );
  }

  const desc = featured.caption || (featured.codecs ? `Format: ${featured.codecs}`
    : "Streamed straight from the original source in original quality.");
  return (
    <section className="relative flex min-h-[54vh] items-end overflow-hidden bg-bg2 pb-9 md:min-h-[74vh] md:pb-[70px]">
      {featured.has_thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl(featured.uuid)} alt=""
          className="absolute inset-0 h-full w-full animate-heroZoom object-cover object-[center_20%] opacity-85" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#050a14_2%,rgba(5,10,20,.35)_45%,transparent_75%),linear-gradient(to_right,rgba(5,10,20,.92)_0%,rgba(5,10,20,.35)_45%,transparent_75%)]" />
      <div className="relative z-[2] max-w-[620px] px-[4vw]">
        <span className="text-[12.5px] font-semibold uppercase tracking-[3px] text-blue-2">Featured</span>
        <h1 className="my-4 font-display text-[clamp(28px,8.5vw,72px)] leading-none tracking-wide
                       [text-shadow:0_4px_30px_rgba(0,0,0,.7)]">
          {displayName(featured)}
        </h1>
        <p className="clamp-3 max-w-[520px] text-[13.5px] leading-relaxed text-[#d3ddec]">{desc}</p>
        <div className="mt-2 text-[13px] text-muted">
          {fmtSize(featured.size)}{featured.duration ? ` · ${fmtDur(featured.duration)}` : ""}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="btn-primary" href={`/watch/${featured.uuid}`}>
            <Icon name="play" size={15} /> Watch now
          </Link>
        </div>
      </div>
    </section>
  );
}
