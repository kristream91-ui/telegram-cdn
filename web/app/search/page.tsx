"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import SeriesCard from "@/components/SeriesCard";
import Icon from "@/components/Icon";
import { getFiles, getProgress, getSeries, loadUser } from "@/lib/api";
import { buildSeries } from "@/lib/series";
import type { MediaFile, Progress, SeriesMeta } from "@/lib/types";

const RECENT_KEY = "ani_recent_search";
type Kind = "all" | "series" | "episodes";

export default function SearchPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [meta, setMeta] = useState<SeriesMeta[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [genre, setGenre] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [f, s] = await Promise.all([getFiles(), getSeries()]);
        setFiles(f); setMeta(s);
      } catch { /* surfaced by the empty state */ }
      setLoading(false);
    })();
    const u = loadUser();
    if (u) getProgress(u.tok).then(setProgress).catch(() => {});
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")); } catch { /* ignore */ }
  }, []);

  const remember = (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    const next = [t, ...recent.filter(r => r.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const genres = useMemo(() => {
    const set = new Set<string>();
    meta.forEach(m => (m.genre || "").split(",").forEach(g => {
      const t = g.trim().replace(/\.$/, "");
      if (t) set.add(t);
    }));
    return [...set].sort();
  }, [meta]);

  const groups = useMemo(() => buildSeries(files, meta), [files, meta]);
  const needle = q.trim().toLowerCase();

  const seriesHits = useMemo(() => groups.filter(g => {
    const m = meta.find(s => s.name === g.name) || ({} as SeriesMeta);
    const okGenre = !genre || (m.genre || "").toLowerCase().includes(genre.toLowerCase());
    if (!okGenre) return false;
    if (!needle) return true;
    return g.name.toLowerCase().includes(needle)
      || (m.genre || "").toLowerCase().includes(needle)
      || (m.year || "").toLowerCase().includes(needle)
      || (m.description || "").toLowerCase().includes(needle);
  }), [groups, meta, needle, genre]);

  const epHits = useMemo(() => files.filter(f => {
    if (!needle) return false;
    return (f.name || "").toLowerCase().includes(needle)
      || (f.caption || "").toLowerCase().includes(needle)
      || (f.series || "").toLowerCase().includes(needle);
  }), [files, needle]);

  const showSeries = kind !== "episodes";
  const showEps = kind !== "series";
  const anyHit = (showSeries && seriesHits.length) || (showEps && epHits.length);

  return (
    <div className="mx-auto max-w-[1400px] px-[4vw] pb-10">
      <h1 className="section-title mb-4 mt-2">Search</h1>

      <form className="relative" onSubmit={e => { e.preventDefault(); remember(q); }}>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="search" size={18} />
        </span>
        <input
          autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search a series, an episode, a genre…"
          className="field pl-12 pr-12 text-[15px]"
        />
        {q && (
          <button type="button" aria-label="Clear"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
            <Icon name="close" size={17} />
          </button>
        )}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {([["all", "All"], ["series", "Series"], ["episodes", "Episodes"]] as [Kind, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`chip ${kind === k ? "chip-on" : ""}`}>{label}</button>
        ))}
        {genres.length > 0 && <span className="mx-1 h-5 w-px bg-line" />}
        {genres.slice(0, 6).map(g => (
          <button key={g} onClick={() => setGenre(genre === g ? null : g)}
            className={`chip ${genre === g ? "chip-on" : ""}`}>{g}</button>
        ))}
      </div>

      {!needle && !genre && (
        <div className="mt-8">
          {recent.length > 0 && (
            <>
              <h2 className="mb-3 text-[12.5px] font-semibold uppercase tracking-widest text-muted">
                Recent searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {recent.map(r => (
                  <button key={r} className="chip" onClick={() => { setQ(r); }}>
                    <Icon name="search" size={12} /> {r}
                  </button>
                ))}
                <button className="chip" onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}>
                  Clear
                </button>
              </div>
            </>
          )}
          <h2 className="mb-3 mt-8 text-[12.5px] font-semibold uppercase tracking-widest text-muted">
            Browse
          </h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {groups.map(g => <SeriesCard key={g.name} s={g} />)}
          </div>
          {!loading && groups.length === 0 && (
            <p className="py-16 text-center text-[13.5px] text-muted">
              Your library is empty — send a video to the Telegram bot to add it.
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="py-24 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-blue-2" />
        </div>
      )}

      {!loading && (needle || genre) && !anyHit && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-panel2 text-blue-2">
            <Icon name="search" size={30} />
          </div>
          <h2 className="font-display text-3xl tracking-wide">No results</h2>
          <p className="mt-2 text-[13.5px] text-muted">
            Nothing matches {q ? `“${q}”` : ""}{genre ? ` in ${genre}` : ""} — try another word or genre.
          </p>
        </div>
      )}

      {showSeries && seriesHits.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title mb-3">
            Series <span className="font-sans text-xs font-normal text-muted">{seriesHits.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {seriesHits.map(g => <SeriesCard key={g.name} s={g} />)}
          </div>
        </section>
      )}

      {showEps && epHits.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title mb-3">
            Episodes <span className="font-sans text-xs font-normal text-muted">{epHits.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {epHits.map(f => (
              <div key={f.uuid} className="[&>a]:w-full">
                <MediaCard f={f} progress={progress[f.uuid]} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!needle && !genre && groups.length > 0 && (
        <p className="mt-8 text-center text-[12.5px] text-muted">
          Tip: search matches series names, episode titles, genres and years.
        </p>
      )}
    </div>
  );
}
