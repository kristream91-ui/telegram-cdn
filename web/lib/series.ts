import type { MediaFile, SeriesGroup, SeriesMeta } from "./types";
import { posterUrl } from "./api";

/** group files into series (same rule as the Python side / old frontend) */
export function buildSeries(files: MediaFile[], meta: SeriesMeta[] = []): SeriesGroup[] {
  const map: Record<string, MediaFile[]> = {};
  files.forEach(f => {
    if (!f.series) return;
    (map[f.series] = map[f.series] || []).push(f);
  });
  return Object.entries(map)
    .map(([name, eps]) => {
      const m = meta.find(s => s.name === name);
      const sorted = [...eps].sort(
        (a, b) => (a.season - b.season) || (a.episode - b.episode));
      return {
        name,
        eps: sorted,
        latest: Math.max(...sorted.map(e => e.created_at || 0)),
        poster: m?.has_poster ? posterUrl(name) : null,
        banner: m?.has_banner ? "banner" : null,   // Hero builds the real URL
        thumbUuid: (sorted.find(e => e.has_thumb) || {}).uuid || null,
      } as SeriesGroup;
    })
    .sort((a, b) => b.latest - a.latest);
}
