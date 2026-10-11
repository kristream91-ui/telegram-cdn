import Link from "next/link";
import type { SeriesGroup } from "@/lib/types";
import { posterUrl, thumbUrl } from "@/lib/api";
import Icon from "./Icon";

export default function SeriesCard({ s }: { s: SeriesGroup }) {
  const seasons = [...new Set(s.eps.map(e => e.season).filter(Boolean))];
  const badge = seasons.length > 1 ? `${seasons.length} Seasons` : `S${seasons[0] || 1}`;
  const img = s.poster || (s.thumbUuid ? thumbUrl(s.thumbUuid) : "");

  return (
    <Link href={`/series/${encodeURIComponent(s.name)}`} title={s.name}
      className="group relative w-[158px] flex-none snap-start md:w-[218px]">
      <div className="relative aspect-video overflow-hidden rounded-[10px] border border-line
                      bg-[radial-gradient(120%_130%_at_20%_10%,#14264a_0%,#0a1326_60%)]
                      transition duration-200 group-hover:-translate-y-1.5 group-hover:scale-[1.04]
                      group-hover:border-blue/50 group-hover:shadow-glow">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-blue-2/50">
            <Icon name="tv" size={34} />
          </span>
        )}
        <span className="absolute inset-0 z-[3] flex items-center justify-center bg-[rgba(4,8,16,.45)]
                         opacity-0 transition group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full text-[#04121c]
                           shadow-[0_0_0_8px_rgba(0,174,239,.18),0_8px_22px_rgba(0,174,239,.5)]
                           bg-gradient-to-br from-blue to-blue-2">
            <Icon name="play" size={15} />
          </span>
        </span>
        <span className="absolute bottom-2 right-2 rounded-md border border-gold/40 bg-[rgba(5,10,20,.85)]
                         px-2 py-0.5 text-[11px] font-semibold text-gold">
          {badge} · {s.eps.length} EP
        </span>
      </div>
      <div className="mt-2 truncate text-[13px] font-semibold">{s.name}</div>
      <div className="mt-0.5 text-[11.5px] text-muted">
        {s.eps.length} episode{s.eps.length > 1 ? "s" : ""}
      </div>
    </Link>
  );
}
