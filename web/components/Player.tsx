"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaFile } from "@/lib/types";
import { streamUrl } from "@/lib/api";
import { fmtDur } from "@/lib/format";
import Icon from "./Icon";

/* Telegram-only player: plain <video> for MP4/WebM/MKV, mpegts.js for .ts.
   No YouTube anywhere. */

const VOL_KEY = "ani_vol";
const RATE_KEY = "ani_rate";
const AUTONEXT_KEY = "ani_autonext";

export default function Player({ file, next, startPos, onSave, onEnded }: {
  file: MediaFile;
  next?: MediaFile | null;
  startPos: number;
  onSave: (uuid: string, pos: number, dur: number) => void;
  onEnded: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buf, setBuf] = useState(0);
  const [rate, setRate] = useState(1);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fs, setFs] = useState(false);
  const [show, setShow] = useState(true);
  const [flash, setFlash] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [autonext, setAutonext] = useState(true);

  /* remembered preferences */
  useEffect(() => {
    try {
      const v = parseFloat(localStorage.getItem(VOL_KEY) || "1");
      if (!isNaN(v)) { setVol(v); setMuted(v === 0); }
      const r = parseFloat(localStorage.getItem(RATE_KEY) || "1");
      if (!isNaN(r)) setRate(r);
      setAutonext(localStorage.getItem(AUTONEXT_KEY) !== "0");
    } catch { /* ignore */ }
  }, []);

  /* build the source */
  useEffect(() => {
    let dead = false;
    let mp: any = null;
    const v = videoRef.current;
    if (!v) return;

    const isTs = /\.ts$/i.test(file.name) || /mp2t/i.test(file.mime || "");
    v.volume = muted ? 0 : vol;
    v.playbackRate = rate;
    if (!isTs) v.src = streamUrl(file.uuid);

    const onMeta = () => {
      if (!isFinite(v.duration) || v.duration <= 0) {
        // MediaSource reports Infinity for mpegts — probe the real duration once
        const onT = () => {
          v.removeEventListener("timeupdate", onT);
          const d = v.duration;
          if (isFinite(d) && d > 0 && startPos > 5 && startPos < d) v.currentTime = startPos;
        };
        v.addEventListener("timeupdate", onT);
        try { v.currentTime = 1e101; } catch { /* ignore */ }
      } else if (startPos > 5 && startPos < v.duration) {
        v.currentTime = startPos;
      }
      setReady(true);
    };
    v.addEventListener("loadedmetadata", onMeta);

    if (isTs) {
      import("mpegts.js").then(mod => {
        if (dead) return;
        const mpegts = (mod as any).default || mod;
        if (!mpegts?.isSupported?.()) {
          setFailed(true);
          setErrMsg("This browser can't play .ts streams — try the download button instead.");
          return;
        }
        mp = mpegts.createPlayer(
          { type: "mpegts", isLive: false, url: streamUrl(file.uuid) },
          { enableWorker: true, lazyLoad: false },
        );
        mp.attachMediaElement(v);
        mp.load();
        mp.play().catch(() => {});
      }).catch(() => { setFailed(true); setErrMsg("Player library failed to load."); });
    } else {
      v.play().catch(() => {});
    }

    return () => {
      dead = true;
      v.removeEventListener("loadedmetadata", onMeta);
      if (mp) { try { mp.destroy(); } catch { /* ignore */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.uuid]);

  /* poll state */
  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      setTime(v.currentTime || 0);
      if (isFinite(v.duration) && v.duration > 0) setDur(v.duration);
      try { setBuf(v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0); } catch { /* ignore */ }
      setPaused(v.paused);
    }, 300);
    return () => clearInterval(id);
  }, []);

  /* persist progress */
  useEffect(() => {
    const tick = setInterval(() => {
      const v = videoRef.current;
      if (v && v.currentTime > 5 && isFinite(v.duration) && v.duration > 0) {
        onSave(file.uuid, v.currentTime, v.duration);
      }
    }, 5000);
    const leave = () => {
      const v = videoRef.current;
      if (v && v.currentTime > 5 && isFinite(v.duration) && v.duration > 0) {
        onSave(file.uuid, v.currentTime, v.duration);
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => { leave(); clearInterval(tick); window.removeEventListener("beforeunload", leave); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.uuid]);

  /* end -> auto-next overlay */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded_ = () => {
      if (next && autonext) setCount(6);
      else onEnded();
    };
    v.addEventListener("ended", onEnded_);
    return () => v.removeEventListener("ended", onEnded_);
  }, [next, autonext, onEnded]);

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) { onEnded(); return; }
    const t = setTimeout(() => setCount(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [count, onEnded]);

  /* fullscreen */
  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else wrapRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }, []);

  const nudge = useCallback((d: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime + d);
    setFlash(d > 0 ? "+10s" : "−10s");
    setTimeout(() => setFlash(""), 600);
  }, []);

  const cycleRate = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const r = speeds[(speeds.indexOf(rate) + 1) % speeds.length];
    setRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
    try { localStorage.setItem(RATE_KEY, String(r)); } catch { /* ignore */ }
  }, [rate]);

  const changeVol = useCallback((value: number) => {
    setVol(value);
    setMuted(value === 0);
    if (videoRef.current) videoRef.current.volume = value;
    try { localStorage.setItem(VOL_KEY, String(value)); } catch { /* ignore */ }
  }, []);

  const toggleMute = useCallback(() => {
    const m = !muted;
    setMuted(m);
    if (videoRef.current) videoRef.current.volume = m ? 0 : vol;
  }, [muted, vol]);

  const pip = useCallback(async () => {
    const v = videoRef.current as any;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v.requestPictureInPicture) await v.requestPictureInPicture();
    } catch { /* not supported */ }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowRight") nudge(10);
      else if (e.key === "ArrowLeft") nudge(-10);
      else if (e.key === "f") toggleFs();
      else if (e.key === "m") toggleMute();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, nudge, toggleFs, toggleMute]);

  const hideTimer = useRef<any>(null);
  const poke = useCallback(() => {
    setShow(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (!videoRef.current?.paused) setShow(false); }, 3200);
  }, []);
  useEffect(() => { poke(); }, [poke]);

  const pct = dur ? (time / dur) * 100 : 0;
  const bufPct = dur ? Math.min(100, (buf / dur) * 100) : 0;

  return (
    <div ref={wrapRef} data-player onMouseMove={poke} onTouchStart={poke}
      className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black shadow-lift">
      <video ref={videoRef} playsInline data-video className="absolute inset-0 h-full w-full bg-black" />

      <div className={`pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-xl
                       border border-line bg-[rgba(4,9,26,.72)] px-3 py-1.5 text-[12.5px] font-semibold
                       backdrop-blur transition ${show ? "opacity-100" : "opacity-0"}`}>
        <Icon name="play" size={12} />
        <span className="clamp-2 max-w-[70vw]">{file.name.replace(/\.[a-z0-9]+$/i, "")}</span>
      </div>

      {!ready && !failed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-blue-2" />
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[rgba(4,9,26,.94)] px-6 text-center">
          <Icon name="alert" size={32} />
          <p className="max-w-[420px] text-[13px] text-muted">{errMsg}</p>
        </div>
      )}

      {flash && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rounded-full bg-black/60 px-4 py-2 font-display text-2xl tracking-wide">{flash}</span>
        </div>
      )}

      <button aria-label="Back 10s" onClick={() => nudge(-10)}
        className="absolute bottom-16 left-0 top-0 z-10 w-[28%]" />
      <button aria-label="Forward 10s" onClick={() => nudge(10)}
        className="absolute bottom-16 right-0 top-0 z-10 w-[28%]" />

      {paused && ready && count === null && (
        <button onClick={togglePlay} aria-label="Play"
          className="absolute inset-0 z-20 m-auto flex h-[70px] w-[70px] items-center justify-center
                     rounded-full bg-logo-grad text-white
                     shadow-[0_0_0_10px_rgba(12,132,252,.16),0_12px_34px_rgba(12,132,252,.5)]">
          <Icon name="play" size={26} />
        </button>
      )}

      {count !== null && next && (
        <div className="absolute bottom-20 right-4 z-30 w-[min(340px,86vw)] rounded-2xl border border-line
                        bg-[rgba(8,17,38,.97)] p-3.5 shadow-soft backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">Up next</div>
          <div className="clamp-2 mt-1 text-[13.5px] font-semibold">{next.name.replace(/\.[a-z0-9]+$/i, "")}</div>
          <div className="mt-3 flex items-center gap-2">
            <a className="btn-primary flex-1" href={`/watch/${next.uuid}`}>
              <Icon name="play" size={14} /> Play now ({count})
            </a>
            <button className="btn-ghost" onClick={() => setCount(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[rgba(3,7,18,.96)] to-transparent
                       px-3 pb-2.5 pt-8 transition ${show || paused ? "opacity-100" : "opacity-0"}`}>
        <div data-seek className="relative mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => {
            const v = videoRef.current;
            if (!v || !dur) return;
            const r = e.currentTarget.getBoundingClientRect();
            v.currentTime = ((e.clientX - r.left) / r.width) * dur;
          }}>
          <i className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: bufPct + "%" }} />
          <i className="absolute inset-y-0 left-0 rounded-full bg-logo-grad" style={{ width: pct + "%" }} />
          <b className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
             style={{ left: pct + "%" }} />
        </div>
        <div className="flex items-center gap-1.5">
          <button className="icon-btn h-9 w-9 border-0 bg-transparent" onClick={togglePlay} aria-label="Play/Pause">
            <Icon name={paused ? "play" : "pause"} size={17} />
          </button>
          <button className="icon-btn h-9 w-9 border-0 bg-transparent" onClick={() => nudge(-10)} aria-label="Back 10s">
            <Icon name="arrowL" size={16} />
          </button>
          <button className="icon-btn h-9 w-9 border-0 bg-transparent" onClick={() => nudge(10)} aria-label="Forward 10s">
            <Icon name="arrowR" size={16} />
          </button>
          <span className="ml-1 text-[12px] tabular-nums text-[#cdd8ea]">
            {fmtDur(time)} / {dur ? fmtDur(dur) : "—"}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-1.5 sm:flex">
              <button className="icon-btn h-9 w-9 border-0 bg-transparent" onClick={toggleMute} aria-label="Mute">
                <Icon name={muted ? "close" : "sliders"} size={15} />
              </button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol}
                onChange={e => changeVol(parseFloat(e.target.value))}
                className="h-1 w-20 accent-blue-2" aria-label="Volume" />
            </div>
            <button className="btn-ghost h-9 px-2.5 text-[12px]" onClick={cycleRate}>{rate}×</button>
            <button className="icon-btn hidden h-9 w-9 border-0 bg-transparent sm:flex" onClick={pip} aria-label="Picture in picture">
              <Icon name="tv" size={16} />
            </button>
            <button className="icon-btn h-9 w-9 border-0 bg-transparent" onClick={toggleFs} aria-label="Fullscreen">
              <Icon name="film" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
