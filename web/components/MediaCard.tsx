import Link from "next/link";
import type { MediaFile } from "@/lib/types";
import { displayName, fmtDur, fmtSize } from "@/lib/format";
import { thumbUrl } from "@/lib/api";
import Icon from "./Icon";

export default function MediaCard({ f, progress }: {
  f: MediaFile;
  progress?: { pos: number; dur: number } | null;
}) {
  const pct = progress && progress.dur
    ? Math.min(100, (progress.pos / progress.dur) * 100) : 0;
  const ep = f.series && f.episode ? `S${f.season || 1}E${f.episode}` : "";

  return (
    <Link href={`/watch/${f.uuid}`} title={f.name}
      className="group relative w-[158px] flex-none snap-start md:w-[218px]">
      <div className="relative aspect-video overflow-hidden rounded-[10px] border border-line
                      bg-[radial-gradient(120%_130%_at_20%_10%,#14264a_0%,#0a1326_60%)]
                      transition duration-200 group-hover:-translate-y-1.5 group-hover:scale-[1.04]
                      group-hover:border-blue/50 group-hover:shadow-glow">
        {f.has_thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl(f.uuid)} alt="" loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-blue-2/50">
            <Icon name={f.series ? "tv" : "film"} size={34} />
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
        {f.duration ? (
          <span className="absolute bottom-2 right-2 rounded-md border border-line bg-[rgba(5,10,20,.85)]
                           px-2 py-0.5 text-[11px] font-semibold text-blue-2">
            {fmtDur(f.duration)}
          </span>
        ) : null}
        {pct > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <i className="block h-full bg-gradient-to-r from-blue to-blue-2 shadow-[0_0_10px_rgba(0,174,239,.8)]"
               style={{ width: pct + "%" }} />
          </span>
        )}
      </div>
      <div className="mt-2 truncate text-[13px] font-semibold">{displayName(f)}</div>
      <div className="mt-0.5 text-[11.5px] text-muted">
        {fmtSize(f.size)}{ep ? ` · ${ep}` : ""}
      </div>
    </Link>
  );
}
