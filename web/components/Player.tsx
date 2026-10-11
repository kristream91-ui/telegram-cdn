"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaFile } from "@/lib/types";
import { API_BASE, streamUrl } from "@/lib/api";
import { fmtDur } from "@/lib/format";
import Icon from "./Icon";

/* ------------------------------------------------------------------ *
 * YouTube IFrame API — loaded once per page
 * ------------------------------------------------------------------ */
let ytPromise: Promise<any> | null = null;
function loadYT(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise(resolve => {
    w.onYouTubeIframeAPIReady = () => resolve(w.YT);
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytPromise;
}

/** one shared control surface over <video> and the YT player */
type Ctl = {
  play(): void; pause(): void; paused(): boolean;
  time(): number; dur(): number; seek(t: number): void;
  rate(r: number): void; buffered(): number;
};

const VOL_KEY = "ani_vol";
const RATE_KEY = "ani_rate";

export default function Player({ file, next, startPos, onSave, onEnded }: {
  file: MediaFile;
  next?: MediaFile | null;
  startPos: number;
  onSave: (uuid: string, pos: number, dur: number) => void;
  onEnded: () => void;
}) {
  const isYT = file.source === "youtube";
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<Ctl | null>(null);
  const ytPlayerRef = useRef<any>(null);

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

  /* remembered volume / speed */
  useEffect(() => {
    try {
      const v = parseFloat(localStorage.getItem(VOL_KEY) || "1");
      if (!isNaN(v)) { setVol(v); setMuted(v === 0); }
      const r = parseFloat(localStorage.getItem(RATE_KEY) || "1");
      if (!isNaN(r)) setRate(r);
    } catch { /* ignore */ }
  }, []);

  /* ---------------- build the source ---------------- */
  useEffect(() => {
    let dead = false;
    let mp: any = null;
    const v = videoRef.current;

    if (isYT) {
      loadYT().then(YT => {
        if (dead || !YT || !ytHostRef.current) return;
        const p = new YT.Player(ytHostRef.current, {
          videoId: file.yt_id,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 0, disablekb: 1 },
          events: {
            onReady: (e: any) => {
              if (dead) return;
              ytPlayerRef.current = e.target;
              ctlRef.current = {
                play: () => e.target.playVideo(),
                pause: () => e.target.pauseVideo(),
                paused: () => e.target.getPlayerState() !== 1,
                time: () => e.target.getCurrentTime() || 0,
                dur: () => e.target.getDuration() || 0,
                seek: (t: number) => e.target.seekTo(t, true),
                rate: (r: number) => e.target.setPlaybackRate(r),
                buffered: () => {
                  try { return (e.target.getVideoLoadedFraction() || 0) * (e.target.getDuration() || 0); }
                  catch { return 0; }
                },
              };
              if (startPos > 5) e.target.seekTo(startPos, true);
              e.target.setPlaybackRate(rate);
              e.target.setVolume(muted ? 0 : vol * 100);
              setReady(true);
              setPaused(false);
              e.target.playVideo();
            },
            onStateChange: (e: any) => {
              if (dead) return;
              if (e.data === 1) { setPaused(false); setFailed(false); }
              if (e.data === 2) setPaused(true);
              if (e.data === 3) setPaused(false);
              if (e.data === 0) { if (next) setCount(6); else onEnded(); }
            },
            onError: () => { if (!dead) { setFailed(true); setErrMsg("YouTube blocked this video from embedding. Try opening it on YouTube."); } },
          },
        });
      });
      return () => { dead = true; };
    }

    // ---- plain video / mpegts ----
    if (!v) return;
    const isTs = /\.ts$/i.test(file.name) || /mp2t/i.test(file.mime || "");
    v.src = isTs ? "" : streamUrl(file.uuid);
    v.volume = muted ? 0 : vol;
    v.playbackRate = rate;

    const attachTs = () => {
      import("mpegts.js").then(mod => {
        if (dead) return;
        const mpegts = (mod as any).default || mod;
        if (!mpegts?.isSupported?.()) {
          setFailed(true);
          setErrMsg("This browser can't play .ts streams. Try the download button.");
          return;
        }
        mp = mpegts.createPlayer(
          { type: "mpegts", isLive: false, url: streamUrl(file.uuid) },
          { enableWorker: true, lazyLoad: false },
        );
        mp.attachMediaElement(v);
        mp.load();
        mp.play().catch(() => {});
      }).catch(() => {
        setFailed(true);
        setErrMsg("Player library failed to load.");
      });
    };

    // MediaSource reports Infinity for mpegts — probe the real duration once
    const onMeta = () => {
      if (!isFinite(v.duration) || v.duration <= 0) {
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

    ctlRef.current = {
      play: () => v.play().catch(() => {}),
      pause: () => v.pause(),
      paused: () => v.paused,
      time: () => v.currentTime || 0,
      dur: () => (isFinite(v.duration) ? v.duration : 0),
      seek: (t: number) => { if (isFinite(t)) v.currentTime = t; },
      rate: (r: number) => { v.playbackRate = r; },
      buffered: () => {
        try { return v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0; }
        catch { return 0; }
      },
    };

    if (isTs) attachTs();
    else v.play().catch(() => {});

    return () => {
      dead = true;
      v.removeEventListener("loadedmetadata", onMeta);
      if (mp) { try { mp.destroy(); } catch { /* ignore */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.uuid]);

  /* ---------------- poll the control surface ---------------- */
  useEffect(() => {
    const id = setInterval(() => {
      const c = ctlRef.current;
      if (!c) return;
      setTime(c.time());
      const d = c.dur();
      if (d && isFinite(d)) setDur(d);
      setBuf(c.buffered());
      setPaused(c.paused());
    }, 300);
    return () => clearInterval(id);
  }, []);

  /* ---------------- save progress every 5s ---------------- */
  useEffect(() => {
    const id = setInterval(() => {
      const c = ctlRef.current;
      if (!c) return;
      const t = c.time(), d = c.dur();
      if (t > 5 && d > 0) onSave(file.uuid, t, d);
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.uuid]);

  useEffect(() => {
    const save = () => {
      const c = ctlRef.current;
      if (c) { const t = c.time(), d = c.dur(); if (t > 5 && d > 0) onSave(file.uuid, t, d); }
    };
    window.addEventListener("beforeunload", save);
    return () => { save(); window.removeEventListener("beforeunload", save); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.uuid]);

  /* ---------------- fullscreen ---------------- */
  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  /* ---------------- controls ---------------- */
  const togglePlay = useCallback(() => {
    const c = ctlRef.current;
    if (!c) return;
    if (c.paused()) { c.play(); setPaused(false); } else { c.pause(); setPaused(true); }
  }, []);

  const nudge = useCallback((d: number) => {
    const c = ctlRef.current;
    if (!c) return;
    c.seek(Math.max(0, c.time() + d));
    setFlash(d > 0 ? "+10s" : "-10s");
    setTimeout(() => setFlash(""), 600);
  }, []);

  const cycleRate = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const i = speeds.indexOf(rate);
    const r = speeds[(i + 1) % speeds.length];
    setRate(r);
    ctlRef.current?.rate(r);
    try { ytPlayerRef.current?.setPlaybackRate(r); } catch { /* ignore */ }
    try { localStorage.setItem(RATE_KEY, String(r)); } catch { /* ignore */ }
  }, [rate]);

  const changeVol = useCallback((v: number) => {
    setVol(v);
    setMuted(v === 0);
    if (videoRef.current) videoRef.current.volume = v;
    const yt = ytPlayerRef.current;
    if (yt) { try { v === 0 ? yt.mute() : (yt.unMute(), yt.setVolume(v * 100)); } catch { /* ignore */ } }
    try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* ignore */ }
  }, []);

  const toggleMute = useCallback(() => {
    const m = !muted;
    setMuted(m);
    if (videoRef.current) videoRef.current.volume = m ? 0 : vol;
    const yt = ytPlayerRef.current;
    if (yt) { try { m ? yt.mute() : (yt.unMute(), yt.setVolume(vol * 100)); } catch { /* ignore */ } }
  }, [muted, vol, isYT]);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowRight") nudge(10);
      else if (e.key === "ArrowLeft") nudge(-10);
      else if (e.key === "f") toggleFs();
      else if (e.key === "m") toggleMute();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, nudge, toggleFs, toggleMute]);

  /* ---------------- auto-hide the bar ---------------- */
  const hideTimer = useRef<any>(null);
  const poke = useCallback(() => {
    setShow(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (!ctlRef.current?.paused()) setShow(false); }, 3200);
  }, []);
  useEffect(() => { poke(); }, [poke]);

  /* ---------------- auto-next countdown ---------------- */
  useEffect(() => {
    if (count === null) return;
    if (count <= 0) { onEnded(); return; }
    const t = setTimeout(() => setCount(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [count, onEnded]);

  /* when playback ends: show the next-episode overlay */
  useEffect(() => {
    const c = ctlRef.current;
    if (!c || !next) return;
    const id = setInterval(() => {
      const cc = ctlRef.current;
      if (!cc) return;
      const t = cc.time(), d = cc.dur();
      if (d > 0 && t >= d - 0.6 && cc.paused()) {
        setCount(prev => (prev === null ? 6 : prev));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [next]);

  const pct = dur ? (time / dur) * 100 : 0;
  const bufPct = dur ? Math.min(100, (buf / dur) * 100) : 0;

  return (
    <div
      ref={wrapRef} data-player
      onMouseMove={poke} onTouchStart={poke}
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-black"
    >
      {/* media */}
      {isYT ? (
        <div ref={ytHostRef} className="absolute inset-0 h-full w-full" />
      ) : (
        <video ref={videoRef} playsInline data-video className="absolute inset-0 h-full w-full bg-black" />
      )}

      {/* title */}
      <div className={`pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-lg
                       bg-[rgba(4,8,16,.7)] px-3 py-1.5 text-[12.5px] font-semibold transition
                       ${show ? "opacity-100" : "opacity-0"}`}>
        <Icon name="play" size={12} />
        <span className="clamp-2 max-w-[70vw]">{file.name.replace(/\.[a-z0-9]+$/i, "")}</span>
      </div>

      {/* spinner */}
      {!ready && !failed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-blue-2" />
        </div>
      )}

      {/* error */}
      {failed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[rgba(4,8,16,.92)] px-6 text-center">
          <Icon name="alert" size={32} />
          <p className="max-w-[420px] text-[13px] text-muted">{errMsg}</p>
          <a className="btn-ghost" href={`https://www.youtube.com/watch?v=${file.yt_id}`} target="_blank" rel="noreferrer">
            Open on YouTube
          </a>
        </div>
      )}

      {/* seek flash */}
      {flash && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rounded-full bg-black/60 px-4 py-2 font-display text-2xl tracking-wide">{flash}</span>
        </div>
      )}

      {/* double-tap seek zones (video only, no YT controls) */}
      {!isYT && (
        <>
          <button aria-label="Back 10s" onClick={() => nudge(-10)}
            className="absolute bottom-16 left-0 top-0 z-10 w-[28%]" />
          <button aria-label="Forward 10s" onClick={() => nudge(10)}
            className="absolute bottom-16 right-0 top-0 z-10 w-[28%]" />
        </>
      )}

      {/* centre play */}
      {paused && ready && count === null && (
        <button onClick={togglePlay} aria-label="Play"
          className="absolute inset-0 z-20 m-auto flex h-[68px] w-[68px] items-center justify-center rounded-full
                     text-[#04121c] shadow-[0_0_0_10px_rgba(0,174,239,.18),0_10px_30px_rgba(0,174,239,.5)]
                     bg-gradient-to-br from-blue to-blue-2">
          <Icon name="play" size={26} />
        </button>
      )}

      {/* next-episode overlay */}
      {count !== null && next && (
        <div className="absolute bottom-20 right-4 z-30 w-[min(330px,84vw)] rounded-xl border border-line
                        bg-[rgba(8,16,32,.96)] p-3.5 shadow-soft">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gold">Up next</div>
          <div className="clamp-2 mt-1 text-[13.5px] font-semibold">{next.name.replace(/\.[a-z0-9]+$/i, "")}</div>
          <div className="mt-3 flex items-center gap-2">
            <a className="btn-primary flex-1 justify-center" href={`/watch/${next.uuid}`}>
              <Icon name="play" size={14} /> Play now ({count})
            </a>
            <button className="btn-ghost" onClick={() => setCount(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* bottom bar */}
      <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[rgba(3,6,12,.95)] to-transparent
                       px-3 pb-2.5 pt-8 transition ${show || paused ? "opacity-100" : "opacity-0"}`}>
        <div data-seek className="relative mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const t = ((e.clientX - r.left) / r.width) * dur;
            ctlRef.current?.seek(t);
          }}>
          <i className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: bufPct + "%" }} />
          <i className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue to-blue-2"
             style={{ width: pct + "%" }} />
          <b className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white
                        shadow" style={{ left: pct + "%" }} />
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
            {!isYT && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <button className="icon-btn h-9 w-9 border-0 bg-transparent" onClick={toggleMute} aria-label="Mute">
                  <Icon name={muted ? "close" : "sliders"} size={15} />
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol}
                  onChange={e => changeVol(parseFloat(e.target.value))}
                  className="h-1 w-20 accent-blue-2" aria-label="Volume" />
              </div>
            )}
            <button className="btn-ghost h-9 px-2.5 text-[12px]" onClick={cycleRate}>{rate}×</button>
            <button className="icon-btn h-9 w-9 border-0 bg-transparent" onClick={toggleFs} aria-label="Fullscreen">
              <Icon name="tv" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
