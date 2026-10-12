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
      className="group relative w-[162px] flex-none snap-start md:w-[224px]">
      <div className="relative rounded-[14px] p-px transition duration-300
                      group-hover:bg-gradient-to-br group-hover:from-cyan/60 group-hover:via-blue/35 group-hover:to-transparent">
        <div className="relative aspect-video overflow-hidden rounded-[13px] border border-line
                        bg-[radial-gradient(120%_130%_at_20%_10%,#12244a_0%,#081326_60%)]
                        transition duration-300 group-hover:-translate-y-1.5 group-hover:border-transparent
                        group-hover:shadow-bloom">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-cyan/40">
              <Icon name="tv" size={34} />
            </span>
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-[rgba(4,7,15,.88)] via-transparent to-transparent" />
          <span className="absolute inset-0 z-[3] flex items-center justify-center bg-[rgba(4,7,15,.4)]
                           opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-logo-grad text-[#02121f]
                             shadow-[0_0_0_8px_rgba(34,224,255,.14),0_10px_28px_rgba(34,224,255,.5)]">
              <Icon name="play" size={15} />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <span className="rounded-md border border-gold/40 bg-[rgba(4,7,15,.82)] px-2 py-0.5
                             text-[10.5px] font-semibold text-gold shadow-goldglow backdrop-blur">
              {badge}
            </span>
            <span className="rounded-md border border-cyan/25 bg-[rgba(4,7,15,.82)] px-2 py-0.5
                             text-[10.5px] font-semibold text-cyan backdrop-blur">
              {s.eps.length} EP
            </span>
          </span>
        </div>
      </div>
      <div className="mt-2 truncate text-[13px] font-semibold transition group-hover:text-cyan">{s.name}</div>
      <div className="mt-0.5 text-[11.5px] text-muted">
        {s.eps.length} episode{s.eps.length > 1 ? "s" : ""}
      </div>
    </Link>
  );
}
