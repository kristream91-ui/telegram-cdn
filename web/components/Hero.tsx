"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MediaFile, SeriesGroup, SeriesMeta } from "@/lib/types";
import { bannerUrl, posterUrl, thumbUrl } from "@/lib/api";
import { displayName, fmtDur, fmtSize } from "@/lib/format";
import Icon from "./Icon";
import Logo from "./Logo";

const VEIL = "bg-[linear-gradient(to_top,#04070f_1%,rgba(4,7,15,.55)_42%,transparent_78%),linear-gradient(to_right,rgba(4,7,15,.96)_0%,rgba(4,7,15,.6)_46%,rgba(4,7,15,.15)_78%,transparent_100%)]";

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
    const t = setInterval(() => setCur(c => (c + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [multi, slides.length]);

  /* ---------- banner slideshow ---------- */
  if (slides.length) {
    const s = slides[Math.min(cur, slides.length - 1)];
    const m = metaOf(s.name) || ({} as SeriesMeta);
    const cont = s.eps.find(e => {
      const p = progressOf(e.uuid);
      return p && p.pos > 10 && p.pos < p.dur - 30;
    });
    const first = cont || s.eps[0];
    const bits = [m.year, m.genre].filter(Boolean).join("  ·  ")
      || `${s.eps.length} episode${s.eps.length > 1 ? "s" : ""}`;

    return (
      <section className="relative flex min-h-[56vh] items-end overflow-hidden pb-9 pt-24 md:min-h-[76vh] md:pb-16">
        {slides.map((sl, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={sl.name} src={bannerUrl(sl.name)} alt="" loading={i ? "lazy" : "eager"}
            className={`absolute inset-0 h-full w-full object-cover object-[center_20%] transition-opacity duration-[900ms]
              ${i === cur ? "opacity-70 animate-heroZoom" : "opacity-0"}`} />
        ))}
        <div className={`absolute inset-0 ${VEIL}`} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />

        <div className="relative z-[2] mx-auto flex w-full max-w-[1440px] items-end gap-10 px-[4vw]">
        <div className="w-full max-w-[660px]">
          <span className="eyebrow">{cont ? "Continue watching" : "Cosmic Anime World"}</span>
          <h1 className="mt-3 font-display text-[clamp(30px,8.5vw,74px)] font-bold italic leading-[0.95] tracking-[0.5px]
                         [text-shadow:0_6px_40px_rgba(0,0,0,.8)]">
            <span className="text-grad">{s.name}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="pill border-gold/70 bg-gold/20 font-bold text-[#ffd48a] shadow-goldglow">HINDI DUB</span>
            <span className="pill border-cyan/60 bg-cyan/15 font-bold text-[#8beeff]">{s.eps.length} EPISODES</span>
            <span className="text-[12.5px] text-muted">{bits}</span>
          </div>
          <p className="clamp-3 mt-3 max-w-[540px] text-[13.5px] leading-relaxed text-[#e8f0ff] [text-shadow:0_2px_14px_rgba(0,0,0,.85)]">
            {m.description || "Streamed straight from your own Telegram library, in original quality."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="btn-primary px-5 py-3" href={`/watch/${first.uuid}`}>
              <Icon name="play" size={15} />
              {cont ? `Resume E${cont.episode || "?"}` : "Play E1"}
            </Link>
            <Link className="btn-ghost px-5 py-3" href={`/series/${encodeURIComponent(s.name)}`}>
              <Icon name="chevR" size={15} /> All episodes
            </Link>
          </div>
          {multi && (
            <div className="mt-6 flex gap-2">
              {slides.map((sl, i) => (
                <button key={sl.name} aria-label={`Slide ${i + 1}`} onClick={() => setCur(i)}
                  className={`h-1 rounded-full transition-all duration-300
                    ${i === cur ? "w-11 bg-logo-grad shadow-[0_0_12px_rgba(34,224,255,.8)]" : "w-5 bg-white/20"}`} />
              ))}
            </div>
          )}
        </div>

        {/* desktop flourish: the poster, tilted, with a bloom behind it */}
        <div className="relative hidden flex-none pb-2 lg:block">
          <span aria-hidden className="absolute -inset-8 rounded-[36px] bg-[radial-gradient(circle,rgba(34,224,255,.28),transparent_68%)] blur-xl" />
          <div className="grad-frame relative w-[248px] rotate-[-3deg] shadow-lift transition duration-500 hover:rotate-0">
            <div className="relative overflow-hidden bg-panel">
              {m.has_poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl(s.name)} alt="" className="aspect-[2/3] w-full object-cover" />
              ) : s.thumbUuid ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(s.thumbUuid)} alt="" className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="aspect-[2/3] w-full bg-panel-grad" />
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[rgba(4,7,15,.95)] to-transparent px-3 pb-2.5 pt-8">
                <span className="font-display text-[13px] font-semibold text-cyan">{s.eps.length} EPISODES</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-logo-grad text-[#02121f]">
                  <Icon name="play" size={11} />
                </span>
              </span>
            </div>
          </div>
        </div>
        </div>
      </section>
    );
  }

  /* ---------- brand / empty state ---------- */
  if (!featured) {
    return (
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-[4vw] py-20 text-center">
        <div className="relative z-[2] mx-auto max-w-[720px]">
          <div className="mx-auto mb-6 flex justify-center animate-floaty">
            <Logo size={132} withWord={false} />
          </div>
          <span className="eyebrow justify-center">Cosmic Anime World</span>
          <h1 className="mt-3 font-display text-[clamp(34px,9vw,72px)] font-bold italic leading-[0.95] tracking-[1px]">
            <span className="text-grad">STREAM HINDI DUB</span>{" "}
            <span className="bg-gradient-to-r from-blue-2 to-cyan bg-clip-text text-transparent">ANIME</span>
            <span className="ml-3 inline-block -translate-y-1 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1
                             align-middle font-sans text-[10px] font-bold tracking-[2px] text-gold shadow-goldglow">FREE</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[520px] text-[13.5px] leading-relaxed text-[#dbe6f7]">
            Your library is empty. Send an MP4 or TS file to the <span className="text-cyan">Ani77 Telegram bot</span> —
            it appears here instantly, ready to stream or download.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/downloads" className="btn-primary px-5 py-3">
              <Icon name="download" size={15} /> Go to Downloads
            </Link>
            <Link href="/explore" className="btn-ghost px-5 py-3">
              <Icon name="search" size={15} /> Browse library
            </Link>
          </div>
          <p className="mt-8 font-display text-[11px] uppercase tracking-[4px] text-muted">
            Powered by Telegram · Nothing re-hosted
          </p>
        </div>
      </section>
    );
  }

  /* ---------- single featured file ---------- */
  const desc = featured.caption || (featured.codecs ? `Format: ${featured.codecs}`
    : "Streamed straight from your own Telegram library, in original quality.");
  return (
    <section className="relative flex min-h-[56vh] items-end overflow-hidden pb-9 pt-24 md:min-h-[76vh] md:pb-16">
      {featured.has_thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl(featured.uuid)} alt=""
          className="absolute inset-0 h-full w-full animate-heroZoom object-cover object-[center_20%] opacity-70" />
      )}
      <div className={`absolute inset-0 ${VEIL}`} />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
      <div className="relative z-[2] w-full max-w-[660px] px-[4vw]">
        <span className="eyebrow">Now streaming</span>
        <h1 className="mt-3 font-display text-[clamp(30px,8.5vw,74px)] font-bold italic leading-[0.95] tracking-[0.5px]
                       [text-shadow:0_6px_40px_rgba(0,0,0,.8)]">
          <span className="text-grad">{displayName(featured)}</span>
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="pill border-gold/70 bg-gold/20 font-bold text-[#ffd48a] shadow-goldglow">HINDI DUB</span>
          {featured.size ? <span className="text-[12.5px] text-muted">{fmtSize(featured.size)}</span> : null}
          {featured.duration ? <span className="text-[12.5px] text-muted">· {fmtDur(featured.duration)}</span> : null}
        </div>
        <p className="clamp-3 mt-3 max-w-[540px] text-[13.5px] leading-relaxed text-[#e8f0ff] [text-shadow:0_2px_14px_rgba(0,0,0,.85)]">{desc}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-primary px-5 py-3" href={`/watch/${featured.uuid}`}>
            <Icon name="play" size={15} /> Watch now
          </Link>
        </div>
      </div>
    </section>
  );
}
