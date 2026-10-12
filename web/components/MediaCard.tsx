import Link from "next/link";
import type { MediaFile } from "@/lib/types";
import { displayName, fmtDur, fmtSize } from "@/lib/format";
import { thumbUrl } from "@/lib/api";
import Icon from "./Icon";

export default function MediaCard({ f, progress }: {
  f: MediaFile;
  progress?: { pos: number; dur: number } | null;
}) {
  const pct = progress && progress.dur ? Math.min(100, (progress.pos / progress.dur) * 100) : 0;
  const ep = f.series && f.episode ? `S${f.season || 1}E${f.episode}` : "";

  return (
    <Link href={`/watch/${f.uuid}`} title={f.name}
      className="group relative w-[162px] flex-none snap-start md:w-[224px]">
      <div className="relative rounded-[14px] p-px transition duration-300
                      group-hover:bg-gradient-to-br group-hover:from-cyan/60 group-hover:via-blue/35 group-hover:to-transparent">
        <div className="relative aspect-video overflow-hidden rounded-[13px] border border-line
                        bg-[radial-gradient(120%_130%_at_20%_10%,#12244a_0%,#081326_60%)]
                        transition duration-300 group-hover:-translate-y-1.5 group-hover:border-transparent
                        group-hover:shadow-bloom">
          {f.has_thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl(f.uuid)} alt="" loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-cyan/40">
              <Icon name={f.series ? "tv" : "film"} size={34} />
            </span>
          )}
          {/* legibility veil */}
          <span className="absolute inset-0 bg-gradient-to-t from-[rgba(4,7,15,.85)] via-transparent to-transparent" />

          <span className="absolute inset-0 z-[3] flex items-center justify-center bg-[rgba(4,7,15,.4)]
                           opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-logo-grad text-[#02121f]
                             shadow-[0_0_0_8px_rgba(34,224,255,.14),0_10px_28px_rgba(34,224,255,.5)]">
              <Icon name="play" size={15} />
            </span>
          </span>

          {f.duration ? (
            <span className="absolute bottom-2 right-2 rounded-md border border-cyan/25 bg-[rgba(4,7,15,.82)]
                             px-2 py-0.5 text-[10.5px] font-semibold text-cyan backdrop-blur">
              {fmtDur(f.duration)}
            </span>
          ) : null}
          {ep ? (
            <span className="absolute left-2 top-2 rounded-md border border-line bg-[rgba(4,7,15,.78)]
                             px-2 py-0.5 text-[10.5px] font-semibold text-[#c8d8f2] backdrop-blur">
              {ep}
            </span>
          ) : null}
          {pct > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
              <i className="block h-full bg-logo-grad shadow-[0_0_10px_rgba(34,224,255,.85)]"
                 style={{ width: pct + "%" }} />
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 truncate text-[13px] font-semibold transition group-hover:text-cyan">
        {displayName(f)}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted">{fmtSize(f.size)}</div>
    </Link>
  );
}
