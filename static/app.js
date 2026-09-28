/* ==================================================================
   Ani77 — Netflix-style frontend (vanilla JS, hash routing, no deps)
   ================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");

let FILES = [];
let SERIES = [];   // series content details (/api/series)
let LOAD_FAILED = false;
let USER = null;       // {id, name, tok, exp} when logged in
let PROGRESS = {};     // logged-in user's watch positions (server-synced)
let HERO_TIMER = null;  // hero banner slideshow auto-rotate
const USER_KEY = "userTok";

/* -------------------------------------------------------------- */
/*  helpers                                                        */
/* -------------------------------------------------------------- */

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
}

/* -------------------------------------------------------------- */
/*  SVG icon set (stroke icons, inherit currentColor)              */
/* -------------------------------------------------------------- */

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
  sliders: '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.4"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.4"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2.4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  chevL: '<polyline points="15 18 9 12 15 6"/>',
  chevR: '<polyline points="9 18 15 12 9 6"/>',
  arrowL: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><polyline points="17 2 12 7 7 2"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/><line x1="3" y1="8" x2="8" y2="8"/><line x1="3" y1="16" x2="8" y2="16"/><line x1="16" y1="8" x2="21" y2="8"/><line x1="16" y1="16" x2="21" y2="16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  ban: '<circle cx="12" cy="12" r="9"/><line x1="5.5" y1="5.5" x2="18.5" y2="18.5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  tag: '<path d="M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l8.6-8.6a1 1 0 0 0 0-1.4L12 2z"/><circle cx="7" cy="7" r="1"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
};

function icon(name, size) {
  const s = size || 16;
  return `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function fmtSize(n) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(n >= 100 || i === 0 ? 0 : 1) + " " + u[i];
}

function fmtDur(s) {
  if (!s) return "";
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`
           : `${m}:${String(x).padStart(2, "0")}`;
}

/* display title without the file extension (keeps the Netflix feel) */
function displayName(f) {
  return String(f.name || f.uuid).replace(/\.(mp4|m4v|mkv|avi|mov|webm|ts|flv|wmv|mpg|mpeg)$/i, "");
}

function toast(msg) {
  const t = $("#toast");
  t.innerHTML = msg;
  t.classList.remove("hidden");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.add("hidden"), 3000);
}

/* continue watching — saved per logged-in profile on the server, so it
   follows the user across devices (guests just watch without progress) */
function savePos(uuid, player) {
  if (!USER || !player || !player.duration || !player.currentTime) return;
  const pos = player.currentTime, dur = player.duration;
  PROGRESS[uuid] = { pos, dur };
  fetch("/api/progress/" + uuid, {
    method: "POST",
    headers: { "Content-Type": "application/json",
               "Authorization": "Bearer " + USER.tok },
    body: JSON.stringify({ pos, dur }),
  }).catch(() => { /* offline — kept in memory for this session */ });
}
function getPos(uuid) {
  return (USER && PROGRESS[uuid]) || null;
}
function started(uuid) {
  const p = getPos(uuid);
  return !!(p && p.pos > 10 && p.pos < p.dur - 30);
}

function codecTag(f) {
  if (!f.codecs) return "";
  const bad = /hevc|ac-3|eac-3/i.test(f.codecs);
  const cls = bad ? "codec-bad" : "codec-ok";
  return ` <span class="${cls}">${esc(f.codecs)}</span>`;
}

/* group files into series: [{name, eps: [files sorted], latest, poster, banner, thumbUuid}] */
function buildSeries(files) {
  const map = {};
  files.forEach(f => {
    if (!f.series) return;
    (map[f.series] = map[f.series] || []).push(f);
  });
  return Object.entries(map).map(([name, eps]) => {
    const meta = SERIES.find(s => s.name === name) || {};
    return {
      name,
      eps: eps.sort((a, b) => (a.season - b.season) || (a.episode - b.episode)),
      latest: Math.max(...eps.map(e => e.created_at || 0)),
      poster: meta.has_poster ? "/poster/" + encodeURIComponent(name) : null,
      banner: meta.has_banner ? "/banner/" + encodeURIComponent(name) : null,
      thumbUuid: (eps.find(e => e.has_thumb) || {}).uuid || null,
    };
  }).sort((a, b) => b.latest - a.latest);
}

function seriesCardHTML(s) {
  const seasons = [...new Set(s.eps.map(e => e.season).filter(Boolean))];
  const badge = seasons.length > 1 ? `${seasons.length} Seasons` : `S${seasons[0] || 1}`;
  const img = s.poster || (s.thumbUuid ? `/thumb/${s.thumbUuid}` : "");
  const inner = img
    ? `<img src="${img}" loading="lazy" alt="" onerror="this.remove()">`
    : `<div class="ph">${icon("tv", 40)}</div>`;
  return `
    <a class="card series-card" href="#/series/${encodeURIComponent(s.name)}" title="${esc(s.name)}">
      <div class="thumb">${inner}
        <div class="play-overlay"><span>${icon("play", 15)}</span></div>
        <span class="badge hd">${badge} · ${s.eps.length} EP</span>
      </div>
      <div class="t">${esc(s.name)}</div>
      <div class="m">${s.eps.length} episode${s.eps.length > 1 ? "s" : ""}</div>
    </a>`;
}

/* fetch wrapper with timeout + friendly errors */
async function api(path, opts) {
  let r;
  try {
    r = await fetch(path, opts);
  } catch {
    throw new Error("Network error — is the server awake?");
  }
  let j = null;
  try { j = await r.json(); } catch { /* non-JSON (e.g. empty) */ }
  if (!r.ok) {
    const d = j && j.detail ? j.detail : `HTTP ${r.status}`;
    throw new Error(typeof d === "string" ? d : JSON.stringify(d));
  }
  return j;
}

/* -------------------------------------------------------------- */
/*  cards & rows                                                   */
/* -------------------------------------------------------------- */

function cardHTML(f, showProgress) {
  const p = getPos(f.uuid);
  const progress = showProgress && p && started(f.uuid)
    ? `<div class="progress"><i style="width:${(p.pos / p.dur * 100).toFixed(1)}%"></i></div>` : "";
  const badge = f.duration
    ? `<span class="badge${/hevc/i.test(f.codecs || "") ? "" : " hd"}">${fmtDur(f.duration)}</span>` : "";
  const img = f.has_thumb
    ? `<img src="/thumb/${f.uuid}" loading="lazy" alt=""
         onerror="this.remove()">` : "";
  const ph = img ? "" : `<div class="ph">${icon(f.series ? "tv" : "film", 34)}</div>`;
  const ep = f.series && f.episode ? ` · <b>S${f.season || 1}E${f.episode}</b>` : "";
  return `
    <a class="card" href="#/watch/${f.uuid}" title="${esc(f.name)}">
      <div class="thumb">${img}${ph}
        <div class="play-overlay"><span>${icon("play", 15)}</span></div>
        ${badge}${progress}
      </div>
      <div class="t">${esc(displayName(f))}</div>
      <div class="m">${fmtSize(f.size)}${codecTag(f)}${ep}</div>
    </a>`;
}

function rowHTML(title, files, id) {
  if (!files.length) return "";
  return `
  <section class="row-section">
    <h2>${title} <span class="count">${files.length}</span></h2>
    <div class="row-wrap">
      <button class="row-arrow left" data-row="${id}" aria-label="Scroll left">${icon("chevL", 22)}</button>
      <div class="row-scroll" id="row-${id}">${files.map(f => cardHTML(f, true)).join("")}</div>
      <button class="row-arrow right" data-row="${id}" aria-label="Scroll right">${icon("chevL", 22)}</button>
    </div>
  </section>`;
}

function brandHeroHTML() {
  return `
  <section class="hero brand-hero">
    <div class="fade"></div>
    <div class="info">
      <img class="brand-logo-lg" src="/static/logo.webp" alt="Ani77">
      <h1>Stream Hindi Dub Anime<span class="badge-new">FREE</span></h1>
      <p class="desc">Your personal OTT library, powered by Telegram. Send an MP4 or TS
        file to the bot or add it with a file_id — and watch it right here, anywhere.</p>
      <div class="cta">
        <a class="btn gold" href="#" id="heroAdd">${icon("plus", 15)} Add your first file</a>
      </div>
    </div>
  </section>`;
}

function heroHTML(f) {
  const desc = f.caption || f.codecs
    ? esc(f.caption || `Format: ${f.codecs}`)
    : "Streamed straight from Telegram in original quality.";
  return `
  <section class="hero">
    ${f.has_thumb ? `<img class="backdrop" src="/thumb/${f.uuid}" alt="" onerror="this.remove()">` : ""}
    <div class="fade"></div>
    <div class="info">
      <span class="tagline">Featured</span>
      <h1>${esc(displayName(f))}</h1>
      <p class="desc">${desc}</p>
      <div class="meta">${fmtSize(f.size)}${f.duration ? " · " + fmtDur(f.duration) : ""}${f.codecs ? " · " + esc(f.codecs) : ""}</div>
      <div class="cta">
        <a class="btn primary" href="#/watch/${f.uuid}">${icon("play", 15)} Watch now</a>
        <a class="btn ghost" href="/download/${f.uuid}">${icon("download", 15)} Download</a>
      </div>
    </div>
  </section>`;
}

/* Hero banner slideshow — series that have a wide horizontal banner
   (uploaded from Admin > Content > Edit) rotate in the big home hero.
   Vertical posters stay in their 2:3 cards; banners stay wide — each
   image shows in its own aspect, never stretched into the other. */
function heroSlidesHTML(slides) {
  const items = slides.map((s, i) => {
    const m = SERIES.find(x => x.name === s.name) || {};
    const cont = s.eps.find(e => started(e.uuid));
    const first = cont || s.eps[0];
    const desc = m.description || `${s.eps.length} episode${s.eps.length > 1 ? "s" : ""} — streamed straight from Telegram in original quality.`;
    const metaBits = [m.year, m.genre].filter(Boolean).map(esc).join(" · ")
      || `${s.eps.length} episode${s.eps.length > 1 ? "s" : ""}`;
    return `
    <div class="hslide${i === 0 ? " active" : ""}">
      <img class="backdrop" src="${s.banner}" alt="" ${i ? 'loading="lazy"' : ""}
        onerror="this.closest('.hslide').style.display='none'">
      <div class="fade"></div>
      <div class="info">
        <span class="tagline">${cont ? "Continue Watching" : "Featured Series"}</span>
        <h1>${esc(s.name)}</h1>
        <div class="meta">${metaBits}</div>
        <p class="desc">${esc(desc)}</p>
        <div class="cta">
          <a class="btn primary" href="#/watch/${first.uuid}">${icon("play", 15)} ${cont ? "Continue E" + (cont.episode || "?") : "Play E1"}</a>
          <a class="btn ghost" href="#/series/${encodeURIComponent(s.name)}">${icon("chevR", 15)} All episodes</a>
        </div>
      </div>
    </div>`;
  }).join("");
  const dots = slides.length > 1
    ? `<div class="hdots">${slides.map((s, i) =>
        `<button class="hdot${i === 0 ? " active" : ""}" data-hd="${i}" aria-label="Banner ${i + 1}"></button>`).join("")}</div>`
    : "";
  return `
  <section class="hero hero-slides">
    <div class="hs-track">${items}</div>
    ${dots}
  </section>`;
}

function stopHeroTimer() {
  if (HERO_TIMER) { clearInterval(HERO_TIMER); HERO_TIMER = null; }
}

function wireHeroSlides() {
  const root = $(".hero-slides");
  if (!root) return;
  const els = [...root.querySelectorAll(".hslide")];
  const dots = [...root.querySelectorAll(".hdot")];
  if (els.length < 2) return;
  let cur = 0;
  const go = n => {
    cur = (n + els.length) % els.length;
    els.forEach((el, i) => el.classList.toggle("active", i === cur));
    dots.forEach((d, i) => d.classList.toggle("active", i === cur));
  };
  stopHeroTimer();
  HERO_TIMER = setInterval(() => go(cur + 1), 6000);
  const restart = () => {
    stopHeroTimer();
    HERO_TIMER = setInterval(() => go(cur + 1), 6000);
  };
  dots.forEach(d => d.addEventListener("click", () => { go(+d.dataset.hd); restart(); }));
  root.addEventListener("pointerenter", stopHeroTimer);
  root.addEventListener("pointerleave", restart);
}

/* -------------------------------------------------------------- */
/*  pages                                                          */
/* -------------------------------------------------------------- */

function skeletonHome() {
  const cards = Array(6).fill(`<div style="flex:0 0 218px"><div class="skel" style="aspect-ratio:16/9"></div>
    <div class="skel" style="height:13px;margin-top:10px;width:70%"></div></div>`).join("");
  app.innerHTML = `
    <div class="skel" style="height:74vh;border-radius:0"></div>
    <section class="row-section"><div class="row-scroll">${cards}</div></section>`;
}

function renderHome() {
  const q = $("#search").value.trim().toLowerCase();
  const files = q
    ? FILES.filter(f => f.name.toLowerCase().includes(q) || (f.caption || "").toLowerCase().includes(q))
    : FILES;

  if (LOAD_FAILED) {
    app.innerHTML = errorBoxHTML("alert", "Couldn't reach the server",
      "The app might be waking up from sleep. Give it a few seconds and retry.", true);
    return;
  }

  if (!FILES.length) {
    app.innerHTML = brandHeroHTML();
    $("#heroAdd").addEventListener("click", e => { e.preventDefault(); openModal(); });
    return;
  }

  if (!files.length) {
    app.innerHTML = heroHTML(FILES[0]) + `
      <div class="empty"><div class="icon">${icon("search", 46)}</div><h3>No results</h3>
      <p>Nothing matches "${esc(q)}".</p></div>`;
    return;
  }

  const watching = FILES.filter(f => started(f.uuid));
  const recent = files.slice(0, 12);
  const hero = files.find(f => f.has_thumb) || files[0];
  const series = buildSeries(files);
  const heroSlides = series.filter(s => s.banner);
  const standalone = files.filter(f => !f.series);

  app.innerHTML = (heroSlides.length ? heroSlidesHTML(heroSlides) : heroHTML(hero))
    + rowHTML("Continue Watching", watching, "cw")
    + rowHTML(q ? `Results for "${esc(q)}"` : "Recently Added", recent, "recent")
    + (series.length ? `
      <section class="row-section">
        <h2>Series <span class="count">${series.length}</span></h2>
        <div class="grid">${series.map(seriesCardHTML).join("")}</div>
      </section>` : "")
    + (standalone.length ? `
      <section class="row-section">
        <h2>Movies & More <span class="count">${standalone.length}</span></h2>
        <div class="grid">${standalone.map(f => cardHTML(f, true)).join("")}</div>
      </section>` : "");

  document.querySelectorAll(".row-arrow").forEach(btn => {
    btn.addEventListener("click", () => {
      const el = $("#row-" + btn.dataset.row);
      if (el) el.scrollBy({ left: (btn.classList.contains("right") ? 1 : -1) * el.clientWidth * 0.8, behavior: "smooth" });
    });
  });
  wireHeroSlides();
}

function errorBoxHTML(iconName, title, msg, retry) {
  return `<div class="error-box">
    <div class="icon">${icon(iconName, 46)}</div>
    <h2>${esc(title)}</h2>
    <p>${esc(msg)}</p>
    ${retry ? '<button class="btn primary" id="retryBtn">↻ Retry</button>' : ""}
  </div>`;
}

async function renderSeries(name) {
  if (!name) { location.hash = "#/"; return; }
  document.title = name + " — Ani77";
  const eps = FILES.filter(f => (f.series || "") === name)
    .sort((a, b) => (a.season - b.season) || (a.episode - b.episode));
  if (!eps.length) { location.hash = "#/"; return; }

  let meta = { description: "", year: "", genre: "" };
  try {
    const all = await api("/api/series");
    meta = all.find(s => s.name === name) || meta;
  } catch { /* details are nice-to-have */ }

  const seasons = [...new Set(eps.map(e => e.season || 1))].sort((a, b) => a - b);
  const cont = eps.find(e => started(e.uuid));
  const first = cont || eps[0];
  const desc = meta.description || "Hindi dub anime — stream straight from Telegram in original quality.";
  const back = meta.has_banner
    ? `/banner/${encodeURIComponent(name)}`
    : meta.has_poster
      ? `/poster/${encodeURIComponent(name)}`
      : ((eps.find(e => e.has_thumb) || {}).uuid ? `/thumb/${eps.find(e => e.has_thumb).uuid}` : "");

  app.innerHTML = `
  <div class="watch-page">
    <a href="#/" class="btn ghost back-btn">${icon("arrowL", 15)} Back</a>
    <section class="series-hero"${back ? ` style="background-image:url('${back}')"` : ""}>
      <div class="s-fade"></div>
      <div class="s-info">
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,5vw,48px);letter-spacing:1px;">
          ${esc(name)}
          ${meta.year ? `<span class="badge-new">${esc(meta.year)}</span>` : ""}</h1>
        <div class="meta" style="color:var(--muted);font-size:13px;margin:6px 0 10px;">
          ${meta.genre ? esc(meta.genre) + " · " : ""}${seasons.length} season${seasons.length > 1 ? "s" : ""} · ${eps.length} episode${eps.length > 1 ? "s" : ""}</div>
        <p style="color:#c3cfe2;max-width:640px;line-height:1.6;">${esc(desc)}</p>
        <div class="cta" style="display:flex;gap:12px;margin:18px 0 8px;">
          <a class="btn primary" href="#/watch/${first.uuid}">${icon("play", 15)} ${cont ? "Continue E" + (cont.episode || "?") : "Play E1"}</a>
        </div>
      </div>
    </section>
    ${seasons.map(sn => `
    <section class="row-section" style="padding-left:0;">
      <h2 style="padding-left:0;">Season ${sn} <span class="count">${eps.filter(e => (e.season || 1) === sn).length} eps</span></h2>
      <div class="ep-list">${eps.filter(e => (e.season || 1) === sn).map(e => `
        <a class="ep-row" href="#/watch/${e.uuid}">
          <span class="ep-num">E${e.episode || "?"}</span>
          <span class="ep-name">${esc(displayName(e))}</span>
          <span class="ep-dur">${fmtDur(e.duration)}${codecTag(e)}</span>
          <span class="ep-play">${icon("play", 13)}</span>
        </a>`).join("")}</div>
    </section>`).join("")}
  </div>`;
}

async function renderWatch(uuid) {
  if (!uuid) { route(); return; }

  let f;
  try {
    f = await api(`/api/files/${uuid}`);
  } catch (e) {
    app.innerHTML = `<div class="watch-page">` + errorBoxHTML(
      "ban", "File not found", e.message + " — it may have been removed.", false)
      + `<div style="text-align:center"><a class="btn ghost" href="#/">${icon("arrowL", 15)} Back home</a></div></div>`;
    return;
  }

  const badCodec = /hevc|ac-3|eac-3/i.test(f.codecs || "");
  const isTS = (f.mime || "").toLowerCase() === "video/mp2t";
  const banner = badCodec
    ? `<div class="codec-banner">${icon("alert", 16)} <b>Codec: ${esc(f.codecs)}</b> — most browsers can't play this.
       If it doesn't start, download it and watch in MX Player / VLC.</div>` : "";

  app.innerHTML = `
  <div class="watch-page">
    <a href="#/" class="btn ghost back-btn">${icon("arrowL", 15)} Back</a>
    ${banner}
    <div class="player-wrap"><video id="player" controls playsinline preload="metadata"
      ${f.has_thumb ? `poster="/thumb/${uuid}"` : ""}
      ${isTS ? "" : `src="/stream/${uuid}"`}></video></div>

    <div class="watch-head">
      <div>
        <h1>${esc(displayName(f))}</h1>
        <div class="meta">${fmtSize(f.size)}<span class="sep">·</span>${esc(f.mime || "unknown")}
          ${f.codecs ? `<span class="sep">·</span>${esc(f.codecs)}` : ""}
          ${f.duration ? `<span class="sep">·</span>${fmtDur(f.duration)}` : ""}
          <span class="sep">·</span>${new Date(f.created_at * 1000).toLocaleDateString()}</div>
        ${f.caption ? `<div class="caption">${esc(f.caption)}</div>` : ""}
      </div>
      <div class="actions">
        <a class="btn gold" href="/download/${uuid}">${icon("download", 15)} Download</a>
        <button class="btn ghost" id="copyBtn">${icon("link", 15)} Copy link</button>
      </div>
    </div>

    ${FILES.filter(x => x.uuid !== uuid).length ? `
    ${f.series && FILES.filter(x => x.series === f.series && x.uuid !== uuid).length ? `
    <section class="row-section" style="padding-top:26px">
      <h2>More Episodes <span class="count">${FILES.filter(x => x.series === f.series && x.uuid !== uuid).length}</span></h2>
      <div class="grid">${FILES.filter(x => x.series === f.series && x.uuid !== uuid).slice(0, 12).map(x => cardHTML(x, true)).join("")}</div>
    </section>` : ""}
    ${FILES.filter(x => x.uuid !== uuid && x.series !== f.series).length ? `
    <section class="row-section" style="padding-top:26px">
      <h2>More Like This</h2>
      <div class="grid">${FILES.filter(x => x.uuid !== uuid && x.series !== f.series).slice(0, 12).map(x => cardHTML(x, true)).join("")}</div>
    </section>` : ""}` : ""}
  </div>`;

  const p = $("#player");
  if (p) {
    const saved = getPos(uuid);
    if (saved && saved.pos > 10 && saved.pos < (saved.dur || Infinity) - 30) {
      p.addEventListener("loadedmetadata", () => {
        try { p.currentTime = saved.pos; } catch { /* not seekable yet */ }
      });
    }
    let last = 0;
    p.addEventListener("timeupdate", () => {
      if (Date.now() - last > 5000) { last = Date.now(); savePos(uuid, p); }
    });
    p.addEventListener("pause", () => savePos(uuid, p));

    function playerFail(title, msg) {
      const wrap = p.closest(".player-wrap");
      if (!wrap) return;
      wrap.innerHTML =
        '<div class="error-box" style="aspect-ratio:auto;padding:70px 20px">' +
        '<div class="icon">' + icon("alert", 46) + '</div>' +
        '<h2>' + title + '</h2>' +
        '<p>' + msg + '</p>' +
        '<a class="btn gold" href="/download/' + uuid + '">' + icon("download", 15) + ' Download</a></div>';
    }

    if (isTS) {
      /* MPEG-TS container (anime files are often TS renamed to .mp4) —
         the browser can't play it natively, so pipe it through mpegts.js. */
      if (window.mpegts && mpegts.getFeatureList().networkStreamIO) {
        /* mpegts.js ignores MediaDataSource.duration on TS streams (only
           its FLV path reads it) — the MSE duration would stay Infinity
           and the seek bar would show no total time. Capture the
           MediaSource that attachMediaElement creates and set the real
           duration (probed from the TS stream's PCRs) on it ourselves. */
        let ms = null;
        const RealMS = window.MediaSource;
        try {
          const PatchedMS = function () { const i = new RealMS(); ms = i; return i; };
          PatchedMS.prototype = RealMS.prototype;
          window.MediaSource = PatchedMS;
        } catch { /* fall back to no patch */ }
        const player = mpegts.createPlayer(
          {
            type: "mpegts", isLive: false, url: "/stream/" + uuid,
            ...(f.duration ? { duration: Math.round(f.duration * 1000) } : {}),
            ...(f.size ? { filesize: f.size } : {}),
          },
          { seekType: "range" });
        player.attachMediaElement(p);
        window.MediaSource = RealMS;
        if (ms && f.duration) {
          const setDur = () => {
            try { if (ms.readyState === "open") ms.duration = f.duration; } catch { /* ignore */ }
          };
          if (ms.readyState === "open") setDur();
          else ms.addEventListener("sourceopen", setDur, { once: true });
        }
        player.on(mpegts.Events.ERROR, () => {
          playerFail("Could not play this TS file",
            "The video codec inside isn't browser-supported" +
            (f.codecs ? " (" + esc(f.codecs) + ")" : "") +
            ". Download it and watch in MX Player / VLC.");
          try { player.destroy(); } catch { /* already gone */ }
        });
        player.load();
      } else {
        playerFail("TS player could not load",
          "The streaming library failed to load — check your connection and reload the page, or download the file instead.");
      }
    } else {
      p.addEventListener("error", () => {
        playerFail("Browser could not play this file",
          "The codec isn't browser-supported" +
          (f.codecs ? " (" + esc(f.codecs) + ")" : "") +
          ". Download it and watch in MX Player / VLC.");
      });
    }
  }

  $("#copyBtn").addEventListener("click", async () => {
    const link = location.origin + "/#/watch/" + uuid;
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied to clipboard!");
    } catch {
      prompt("Copy this link:", link);
    }
  });
}

/* -------------------------------------------------------------- */
/*  modal                                                          */
/* -------------------------------------------------------------- */

function openModal() {
  $("#modal").classList.remove("hidden");
  $("#addStatus").classList.add("hidden");
  $("#fidInput").focus();
}
function closeModal() {
  $("#modal").classList.add("hidden");
}

function addStatus(msg, isError) {
  const s = $("#addStatus");
  s.textContent = msg;
  s.className = "add-status" + (isError ? " error" : "");
}

/* -------------------------------------------------------------- */
/*  admin panel                                                    */
/* -------------------------------------------------------------- */

const ADMIN_KEY = "adminTok";

function adminTok() {
  try {
    const t = JSON.parse(localStorage.getItem(ADMIN_KEY));
    if (t && t.exp && t.exp > Date.now() / 1000 + 60) return t.tok;
  } catch { /* corrupt entry */ }
  localStorage.removeItem(ADMIN_KEY);
  return null;
}

function adminApi(path, opts) {
  const headers = Object.assign({}, (opts && opts.headers) || {},
    { "Authorization": "Bearer " + adminTok() });
  return api(path, Object.assign({}, opts, { headers: headers }));
}

let ADMIN_TAB = "content";
let ADMIN_SERIES = [];
let ADMIN_FILES = [];

/* styled modal helpers (admin) */
function aModal(html) {
  const root = $("#adminModalRoot");
  if (!root) return;
  root.innerHTML = `<div class="modal" id="aModal"><div class="modal-box admin-modal">${html}</div></div>`;
  $("#aModal").addEventListener("click", e => {
    if (e.target.id === "aModal") aModalClose();
  });
}
function aModalClose() {
  const root = $("#adminModalRoot");
  if (root) root.innerHTML = "";
}

async function adminLoadData() {
  try { ADMIN_SERIES = (await api("/api/series")) || []; } catch { ADMIN_SERIES = []; }
  try { ADMIN_FILES = (await api("/api/files")) || []; } catch { ADMIN_FILES = []; }
  SERIES = ADMIN_SERIES;
}

/* ---------------- content tab (series cards) ---------------- */

function adminContentHTML() {
  if (!ADMIN_SERIES.length) {
    return `<div class="empty"><div class="icon">${icon("tv", 46)}</div><h3>No series yet</h3>
      <p>Files with SxxExx in the name (e.g. Tensura S4E1.mp4) are grouped automatically.
      You can also group them manually from the Files tab.</p></div>`;
  }
  return `<div class="admin-cards">${ADMIN_SERIES.map((s, i) => `
    <div class="acard" style="animation-delay:${Math.min(i * 0.05, 0.4)}s">
      <div class="acard-img">
        ${s.has_poster
          ? `<img src="/poster/${encodeURIComponent(s.name)}" loading="lazy" onerror="this.remove()">`
          : `<span class="acard-ph">${icon("tv", 40)}</span>`}
        <span class="acard-eps">${s.episodes} EP</span>
      </div>
      <div class="acard-body">
        <b>${esc(s.name)}</b>
        <div class="acard-meta">${esc(s.year || "—")} · ${esc(s.genre || "No genre")}</div>
        <p>${esc(s.description
          ? s.description.slice(0, 110) + (s.description.length > 110 ? "…" : "")
          : "No description yet — add one!")}</p>
        <button class="btn small primary" data-edit="${esc(s.name)}">${icon("edit", 13)} Edit details</button>
      </div>
    </div>`).join("")}</div>`;
}

/* ---------------- files tab (file rows) ---------------- */

function adminFilesHTML() {
  if (!ADMIN_FILES.length) {
    return `<div class="empty"><div class="icon">${icon("film", 46)}</div><h3>No files yet</h3>
      <p>Use the <b>Add file</b> tab above, or send files to the bot.</p></div>`;
  }
  const rows = [...ADMIN_FILES].sort((a, b) => b.created_at - a.created_at).map((f, i) => {
    const isTS = (f.mime || "").toLowerCase().includes("mp2t");
    return `
    <div class="afile" style="animation-delay:${Math.min(i * 0.04, 0.3)}s">
      <div class="afile-thumb">
        ${f.has_thumb
          ? `<img src="/thumb/${f.uuid}" loading="lazy" onerror="this.remove()">`
          : `<span>${icon("film", 20)}</span>`}
      </div>
      <div class="afile-info">
        <b title="${esc(f.name || f.uuid)}">${esc(f.name || f.uuid)}</b>
        <span class="afile-meta">
          ${f.series
            ? `<span class="pill blue">S${f.season || 1} · E${f.episode || "?"}</span>`
            : `<span class="pill">movie</span>`}
          ${isTS ? `<span class="pill gold">TS</span>` : ""}
          <span>${fmtSize(f.size)}</span>
          ${f.duration ? `<span>· ${fmtDur(f.duration)}</span>` : ""}
          ${f.codecs ? `<span>· ${esc(f.codecs)}</span>` : ""}
        </span>
      </div>
      <div class="afile-ops">
        <a class="ibtn" href="#/watch/${f.uuid}" title="Watch">${icon("play", 14)}</a>
        <button class="ibtn" data-group="${f.uuid}" data-series="${esc(f.series || "")}"
          data-season="${f.season || 1}" data-episode="${f.episode || 1}"
          data-name="${esc(f.name || "")}" title="Group into series">${icon("tag", 14)}</button>
        <button class="ibtn" data-rename="${f.uuid}" data-name="${esc(f.name || "")}"
          title="Rename">${icon("edit", 14)}</button>
        <button class="ibtn danger" data-del="${f.uuid}" data-name="${esc(f.name || "")}"
          title="Delete">${icon("trash", 14)}</button>
      </div>
    </div>`;
  }).join("");
  const opts = [...new Set(ADMIN_SERIES.map(s => s.name))]
    .map(n => `<option value="${esc(n)}">`).join("");
  return `<datalist id="agList">${opts}</datalist><div class="afile-list">${rows}</div>`;
}

/* ---------------- add tab ---------------- */

function adminAddHTML() {
  return `<div class="admin-add">
    <h3>${icon("plus", 18)} Add a file</h3>
    <p class="page-sub" style="margin-bottom:4px;">Paste a Telegram <b>file_id</b> — size, format and codecs are auto-detected.
    Use the <b>SxxExx pattern</b> in the name so episodes group automatically.</p>
    <label>file_id <span class="req">*</span></label>
    <input id="aaFid" placeholder="BQACAgUAAxkB..." spellcheck="false">
    <label>Name (with extension)</label>
    <input id="aaName" placeholder="Tensura S4E1 Hindi Dub.mp4">
    <div class="admin-add-row">
      <div><label>Size in bytes (optional)</label>
        <input id="aaSize" type="number" min="0" placeholder="224000000"></div>
      <div><label>Mime type (optional)</label>
        <input id="aaMime" placeholder="video/mp4"></div>
    </div>
    <div id="aaStatus" class="add-status hidden"></div>
    <button class="btn primary" id="aaGo" style="margin-top:16px;">${icon("plus", 15)} Detect & Add</button>
  </div>`;
}

function wireAdminAdd() {
  const go = $("#aaGo");
  go.addEventListener("click", async () => {
    const fid = $("#aaFid").value.trim();
    const st = $("#aaStatus");
    if (!fid) {
      st.textContent = "file_id is required — paste the Telegram file_id first.";
      st.className = "add-status error";
      return;
    }
    go.disabled = true;
    go.textContent = "Detecting…";
    try {
      await api("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: fid,
          file_name: $("#aaName").value.trim(),
          file_size: Number($("#aaSize").value) || 0,
          mime_type: $("#aaMime").value.trim(),
        }),
      });
      toast("Added " + icon("check", 13));
      await loadFiles();
      await adminLoadData();
      ADMIN_TAB = "files";
      document.querySelectorAll(".admin-tab").forEach(x =>
        x.classList.toggle("active", x.dataset.atab === "files"));
      renderAdminTab();
    } catch (e) {
      st.textContent = e.message;
      st.className = "add-status error";
    } finally {
      go.disabled = false;
      go.innerHTML = `${icon("plus", 15)} Detect & Add`;
    }
  });
}

/* ---------------- admin modals ---------------- */

function openSeriesEdit(name) {
  const s = ADMIN_SERIES.find(x => x.name === name) ||
    { name, description: "", year: "", genre: "", has_poster: false };
  aModal(`
    <h2>${icon("edit", 20)} ${esc(name)}</h2>
    <label>Poster — vertical image (2:3, e.g. 300x450)</label>
    <div class="ae-poster">
      ${s.has_poster
        ? `<img src="/poster/${encodeURIComponent(name)}" onerror="this.remove()">`
        : `<span class="ae-ph">${icon("tv", 40)}</span>`}
    </div>
    <input id="aeFile" type="file" accept="image/*" style="padding:6px;">
    ${s.has_poster
      ? `<button class="btn small danger" id="aeDelPoster" style="margin-top:8px;">${icon("trash", 13)} Remove poster</button>`
      : `<p class="hint" style="margin-top:6px;">Vertical posters show in the 2:3 series cards.</p>`}
    <label style="margin-top:16px;">Hero banner — horizontal image (16:9, e.g. 1920x1080)</label>
    <div class="ae-banner">
      ${s.has_banner
        ? `<img src="/banner/${encodeURIComponent(name)}" onerror="this.remove()">`
        : `<span class="ae-ph">${icon("film", 34)}</span>`}
    </div>
    <input id="aeBannerFile" type="file" accept="image/*" style="padding:6px;">
    ${s.has_banner
      ? `<button class="btn small danger" id="aeDelBanner" style="margin-top:8px;">${icon("trash", 13)} Remove banner</button>`
      : `<p class="hint" style="margin-top:6px;">Wide banners rotate in the big home hero — kept wide, never squeezed into posters.</p>`}
    <div class="ae-grid">
      <div><label>Release year</label><input id="aeYear" value="${esc(s.year || "")}" placeholder="2025"></div>
      <div><label>Genre</label><input id="aeGenre" value="${esc(s.genre || "")}" placeholder="Action, Fantasy, Isekai"></div>
    </div>
    <label>Description</label>
    <textarea id="aeDesc" rows="4" placeholder="Anime story / description...">${esc(s.description || "")}</textarea>
    <div class="modal-actions">
      <button class="btn ghost" id="aeCancel">Cancel</button>
      <button class="btn primary" id="aeSave">Save details</button>
    </div>`);
  $("#aeCancel").addEventListener("click", aModalClose);
  $("#aeFile").addEventListener("change", () => {
    const f = $("#aeFile").files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const rd = new FileReader();
    rd.onload = () => {
      const box = $(".ae-poster");
      box.innerHTML = `<img src="${rd.result}">`;
    };
    rd.readAsDataURL(f);
  });
  $("#aeBannerFile").addEventListener("change", () => {
    const f = $("#aeBannerFile").files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const rd = new FileReader();
    rd.onload = () => {
      const box = $(".ae-banner");
      box.innerHTML = `<img src="${rd.result}">`;
    };
    rd.readAsDataURL(f);
  });
  const dp = $("#aeDelPoster");
  if (dp) dp.addEventListener("click", async () => {
    dp.disabled = true;
    try {
      await adminApi(`/api/series/${encodeURIComponent(name)}/poster`, { method: "DELETE" });
      toast("Poster removed " + icon("check", 13));
      aModalClose();
      await loadFiles();
      await adminLoadData();
      renderAdminTab();
    } catch (e) { toast(e.message); dp.disabled = false; }
  });
  const db_ = $("#aeDelBanner");
  if (db_) db_.addEventListener("click", async () => {
    db_.disabled = true;
    try {
      await adminApi(`/api/series/${encodeURIComponent(name)}/banner`, { method: "DELETE" });
      toast("Banner removed " + icon("check", 13));
      aModalClose();
      await loadFiles();
      await adminLoadData();
      renderAdminTab();
    } catch (e) { toast(e.message); db_.disabled = false; }
  });
  $("#aeSave").addEventListener("click", async () => {
    const btn = $("#aeSave");
    const posterFile = $("#aeFile").files[0];
    const bannerFile = $("#aeBannerFile").files[0];
    try {
      if (posterFile) {
        btn.disabled = true; btn.textContent = "Uploading…";
        const fd = new FormData();
        fd.append("poster", posterFile);
        await adminApi(`/api/series/${encodeURIComponent(name)}/poster`,
          { method: "POST", body: fd });
        btn.textContent = "Saving…";
      }
      if (bannerFile) {
        btn.disabled = true; btn.textContent = "Uploading…";
        const fd = new FormData();
        fd.append("banner", bannerFile);
        await adminApi(`/api/series/${encodeURIComponent(name)}/banner`,
          { method: "POST", body: fd });
        btn.textContent = "Saving…";
      }
      await adminApi(`/api/series/${encodeURIComponent(name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: $("#aeYear").value.trim(),
          genre: $("#aeGenre").value.trim(),
          description: $("#aeDesc").value.trim(),
        }),
      });
      toast("Details saved " + icon("check", 13));
      aModalClose();
      await loadFiles();
      await adminLoadData();
      renderAdminTab();
    } catch (e) {
      toast(e.message);
      btn.disabled = false;
      btn.textContent = "Save details";
    }
  });
}

function openRenameModal(uuid, oldName) {
  aModal(`
    <h2>${icon("edit", 20)} Rename file</h2>
    <label>New name (with extension)</label>
    <input id="arName" value="${esc(oldName)}" placeholder="Movie.mp4" spellcheck="false">
    <p class="hint">Tip: the SxxExx pattern (e.g. Tensura S4E3.mp4) auto-groups episodes into series.</p>
    <div class="modal-actions">
      <button class="btn ghost" id="arCancel">Cancel</button>
      <button class="btn primary" id="arSave">Rename</button>
    </div>`);
  $("#arCancel").addEventListener("click", aModalClose);
  $("#arName").focus();
  $("#arName").addEventListener("keydown", e => { if (e.key === "Enter") $("#arSave").click(); });
  $("#arSave").addEventListener("click", async () => {
    const name = $("#arName").value.trim();
    if (!name) return;
    const btn = $("#arSave");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      await adminApi(`/api/files/${uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: name }),
      });
      toast("Renamed " + icon("check", 13));
      aModalClose();
      await loadFiles();
      await adminLoadData();
      renderAdminTab();
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = "Rename"; }
  });
}

function openGroupModal(uuid, series, season, episode) {
  aModal(`
    <h2>${icon("tag", 20)} Group into a series</h2>
    <label>Series name (empty = standalone movie)</label>
    <input id="agSeries" list="agList" value="${esc(series || "")}" placeholder="Tensura" spellcheck="false">
    <p class="hint">Existing series are suggested as you type.</p>
    <div class="ae-grid">
      <div><label>Season</label><input id="agSeason" type="number" min="0" value="${season || 1}"></div>
      <div><label>Episode</label><input id="agEpisode" type="number" min="0" value="${episode || 1}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" id="agCancel">Cancel</button>
      <button class="btn primary" id="agSave">Save grouping</button>
    </div>`);
  $("#agCancel").addEventListener("click", aModalClose);
  $("#agSeries").focus();
  $("#agSave").addEventListener("click", async () => {
    const btn = $("#agSave");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      await adminApi(`/api/files/${uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: $("#agSeries").value.trim(),
          season: Number($("#agSeason").value) || 0,
          episode: Number($("#agEpisode").value) || 0,
        }),
      });
      toast("Grouping saved " + icon("check", 13));
      aModalClose();
      await loadFiles();
      await adminLoadData();
      renderAdminTab();
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = "Save grouping"; }
  });
}

function openDeleteModal(uuid, name) {
  aModal(`
    <h2 style="color:var(--red)">${icon("trash", 20)} Delete file?</h2>
    <p class="hint"><b>${esc(name || uuid)}</b> will be removed from the library.
    The original Telegram file is not deleted — you can add it again anytime.</p>
    <div class="modal-actions">
      <button class="btn ghost" id="adCancel">Cancel</button>
      <button class="btn danger" id="adGo">${icon("trash", 14)} Delete</button>
    </div>`);
  $("#adCancel").addEventListener("click", aModalClose);
  $("#adGo").addEventListener("click", async () => {
    const btn = $("#adGo");
    btn.disabled = true; btn.textContent = "Deleting…";
    try {
      await adminApi(`/api/files/${uuid}`, { method: "DELETE" });
      toast("Deleted " + icon("check", 13));
      aModalClose();
      await loadFiles();
      await adminLoadData();
      renderAdminTab();
    } catch (e) { toast(e.message); btn.disabled = false; btn.innerHTML = `${icon("trash", 14)} Delete`; }
  });
}

/* ---------------- admin shell ---------------- */

function renderAdminTab() {
  const body = $("#adminBody");
  if (!body) return;
  if (ADMIN_TAB === "files") body.innerHTML = adminFilesHTML();
  else if (ADMIN_TAB === "add") { body.innerHTML = adminAddHTML(); wireAdminAdd(); }
  else body.innerHTML = adminContentHTML();

  body.querySelectorAll("[data-edit]").forEach(b =>
    b.addEventListener("click", () => openSeriesEdit(b.dataset.edit)));
  body.querySelectorAll("[data-group]").forEach(b =>
    b.addEventListener("click", () =>
      openGroupModal(b.dataset.group, b.dataset.series, +b.dataset.season, +b.dataset.episode)));
  body.querySelectorAll("[data-rename]").forEach(b =>
    b.addEventListener("click", () => openRenameModal(b.dataset.rename, b.dataset.name)));
  body.querySelectorAll("[data-del]").forEach(b =>
    b.addEventListener("click", () => openDeleteModal(b.dataset.del, b.dataset.name)));
}

async function renderAdmin() {
  document.title = "Admin — Ani77";
  const tok = adminTok();

  if (!tok) {
    app.innerHTML = `
    <div class="admin-page">
      <div class="modal-box" style="max-width:400px;margin:8vh auto 0">
        <h2>${icon("shield", 22)} Admin Login</h2>
        <p class="hint">Only the admin can manage the library.</p>
        <label>Password</label>
        <input id="adminPw" type="password" placeholder="••••••••" autocomplete="current-password">
        <div id="adminStatus" class="add-status hidden"></div>
        <div class="modal-actions">
          <a class="btn ghost" href="#/">${icon("arrowL", 14)} Back</a>
          <button id="adminLogin" class="btn primary">Login</button>
        </div>
      </div>
    </div>`;
    const doLogin = async () => {
      const btn = $("#adminLogin");
      btn.disabled = true;
      btn.textContent = "Checking…";
      try {
        const j = await api("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: $("#adminPw").value }),
        });
        localStorage.setItem(ADMIN_KEY, JSON.stringify({ tok: j.token, exp: j.expires_at }));
        toast("Admin login " + icon("check", 13));
        renderAdmin();
      } catch (e) {
        const s = $("#adminStatus");
        s.textContent = e.message;
        s.className = "add-status error";
      } finally {
        btn.disabled = false;
        btn.textContent = "Login";
      }
    };
    $("#adminLogin").addEventListener("click", doLogin);
    $("#adminPw").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
    $("#adminPw").focus();
    return;
  }

  app.innerHTML = `
  <div class="admin-page">
    <div class="admin-top">
      <h1 class="admin-title">${icon("shield", 30)} Admin Panel</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a class="btn ghost" href="#/">${icon("arrowL", 14)} Site</a>
        <button id="adminLogout" class="btn danger">${icon("logout", 14)} Logout</button>
      </div>
    </div>
    <div id="adminStats" class="stat-grid"></div>
    <div class="admin-tabs">
      <button class="admin-tab active" data-atab="content">${icon("tv", 15)} Content</button>
      <button class="admin-tab" data-atab="files">${icon("film", 15)} Files</button>
      <button class="admin-tab" data-atab="add">${icon("plus", 15)} Add file</button>
    </div>
    <div id="adminBody"></div>
  </div>
  <div id="adminModalRoot"></div>`;

  $("#adminLogout").addEventListener("click", () => {
    localStorage.removeItem(ADMIN_KEY);
    toast("Logged out");
    location.hash = "#/";
    route();
  });

  document.querySelectorAll(".admin-tab").forEach(t =>
    t.addEventListener("click", () => {
      ADMIN_TAB = t.dataset.atab;
      document.querySelectorAll(".admin-tab").forEach(x =>
        x.classList.toggle("active", x === t));
      renderAdminTab();
    }));

  try {
    const s = await adminApi("/api/admin/stats");
    $("#adminStats").innerHTML = `
      <div class="stat"><b>${s.files}</b><span>Files</span></div>
      <div class="stat"><b>${s.series}</b><span>Series</span></div>
      <div class="stat"><b>${s.ts_files}</b><span>TS files</span></div>
      <div class="stat"><b>${fmtSize(s.total_size)}</b><span>Library size</span></div>
      <div class="stat"><b>${s.bot_online ? "Online" : "Offline"}</b><span>Bot</span></div>`;
  } catch (e) {
    localStorage.removeItem(ADMIN_KEY);
    renderAdmin();
    return;
  }

  await adminLoadData();
  renderAdminTab();
}

/* -------------------------------------------------------------- */
/*  routing + boot                                                 */
/* -------------------------------------------------------------- */

function route() {
  const h = location.hash || "#/";
  closeDrawer();
  stopHeroTimer();
  if (h.startsWith("#/watch/")) { setTab(null); renderWatch(decodeURIComponent(h.split("/")[2] || "")); }
  else if (h.startsWith("#/series/")) { setTab(null); renderSeries(decodeURIComponent(h.split("/")[2] || "")); }
  else if (h.startsWith("#/admin")) { setTab(null); renderAdmin(); }
  else if (h.startsWith("#/schedule")) { setTab("schedule"); renderSchedule(); }
  else if (h.startsWith("#/settings")) { setTab("settings"); renderSettings(); }
  else {
    setTab("home");
    document.title = "Ani77 — Stream Hindi Dub Anime";
    renderHome();
    window.scrollTo(0, 0);
  }
}

function setTab(id) {
  document.querySelectorAll("#tabbar .tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === id));
}

/* -------------------------------------------------------------- */
/*  schedule page (Events & News)                                  */
/* -------------------------------------------------------------- */

function dayLabel(ts) {
  const d = new Date(ts * 1000), now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - that) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return diff + " days ago";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function renderSchedule() {
  document.title = "Schedule — Ani77";
  if (LOAD_FAILED) {
    app.innerHTML = errorBoxHTML("alert", "Couldn't reach the server",
      "The app might be waking up from sleep. Give it a few seconds and retry.", true);
    return;
  }
  if (!FILES.length) {
    app.innerHTML = `<div class="page">
      <h1 class="page-title">${icon("calendar", 26)} Schedule · Events & News</h1>
      <div class="empty"><div class="icon">${icon("calendar", 46)}</div><h3>Nothing scheduled yet</h3>
      <p>Add files and they'll show up here as a release timeline.</p></div>
    </div>`;
    return;
  }
  const eps = [...FILES].sort((a, b) => b.created_at - a.created_at);
  const groups = {};
  eps.forEach(f => {
    const lbl = dayLabel(f.created_at);
    (groups[lbl] = groups[lbl] || []).push(f);
  });
  app.innerHTML = `<div class="page">
    <h1 class="page-title">${icon("calendar", 26)} Schedule · Events & News</h1>
    <p class="page-sub">New episodes & movies, latest first</p>
    ${Object.entries(groups).map(([day, list]) => `
    <section class="row-section">
      <h2>${esc(day)} <span class="count">${list.length}</span></h2>
      <div class="ep-list">${list.map(f => `
        <a class="ep-row" href="#/watch/${f.uuid}">
          <span class="ep-num">${f.series ? "E" + (f.episode || "?") : icon("film", 16)}</span>
          <span class="ep-name">${esc(displayName(f))}${f.series ? ` · <b>S${f.season || 1}</b>` : ""}</span>
          <span class="ep-dur">${fmtDur(f.duration)}${codecTag(f)}</span>
          <span class="ep-play">${icon("play", 13)}</span>
        </a>`).join("")}</div>
    </section>`).join("")}
  </div>`;
}

/* -------------------------------------------------------------- */
/*  downloads & settings page                                      */
/* -------------------------------------------------------------- */

function renderSettings() {
  document.title = "More — Ani77";
  const profile = USER
    ? `<div class="drawer-profile" style="margin:0;">
        <span class="avatar avatar-lg">${esc((USER.name || "?").charAt(0).toUpperCase())}</span>
        <div class="dp-info"><b>${esc(USER.name)}</b><span>Logged in</span></div>
      </div>
      <button class="btn ghost" id="logoutBtn2" style="width:100%;margin-top:12px;">Log Out</button>`
    : `<p class="page-sub" style="margin-bottom:12px;">Log in to sync your Continue Watching across devices.</p>
      <div class="drawer-auth">
        <button class="btn ghost" id="sLogin">Log In</button>
        <button class="btn primary" id="sSignup">Sign Up</button>
      </div>`;
  const downloads = FILES.length
    ? FILES.map(f => `
      <a class="dl-row" href="/download/${f.uuid}">
        <span class="dl-ico">${icon("download", 18)}</span>
        <span class="dl-name">${esc(f.name || f.uuid)}
          <small>${fmtSize(f.size)}${f.duration ? " · " + fmtDur(f.duration) : ""}${f.series ? " · S" + (f.season || 1) + "E" + (f.episode || "?") : ""}</small></span>
        <span class="dl-go">Download</span>
      </a>`).join("")
    : `<div class="empty" style="padding:30px"><p>No files yet — ask the admin to add some.</p></div>`;
  app.innerHTML = `<div class="page">
    <h1 class="page-title">${icon("download", 26)} Downloads & Settings</h1>

    <section class="settings-card">
      <h3>${icon("user", 18)} Profile</h3>
      ${profile}
    </section>

    <section class="settings-card">
      <h3>${icon("download", 18)} Downloads</h3>
      <p class="page-sub" style="margin-bottom:10px;">Tap a file to download it to your device (watch in MX Player / VLC).</p>
      ${downloads}
    </section>

    <section class="settings-card">
      <h3>${icon("sliders", 18)} More</h3>
      <a class="drawer-item" href="#/admin">${icon("shield", 17)} Admin panel</a>
      <button class="drawer-item" id="sAdd">${icon("plus", 17)} Add a file by file_id</button>
    </section>
  </div>`;
  const l2 = $("#logoutBtn2");
  if (l2) l2.addEventListener("click", () => { doLogout(); route(); });
  const sl = $("#sLogin"); if (sl) sl.addEventListener("click", () => openAuthModal("login"));
  const ss = $("#sSignup"); if (ss) ss.addEventListener("click", () => openAuthModal("signup"));
  const sa = $("#sAdd"); if (sa) sa.addEventListener("click", () => openModal());
}

async function loadFiles() {
  LOAD_FAILED = false;
  try {
    FILES = (await api("/api/files")) || [];
  } catch (e) {
    LOAD_FAILED = true;
    FILES = [];
  }
  try { SERIES = (await api("/api/series")) || []; }
  catch { SERIES = []; }
  await loadProgress();
}

async function loadProgress() {
  if (!USER) { PROGRESS = {}; return; }
  try {
    PROGRESS = (await api("/api/progress", {
      headers: { "Authorization": "Bearer " + USER.tok },
    })) || {};
  } catch (e) {
    PROGRESS = {};
    // token expired (e.g. after a server redeploy) -> quietly log out
    if (String(e.message).includes("Not logged in")) doLogout(true);
  }
}

/* -------------------------------------------------------------- */
/*  user profiles (sign up / log in / log out)                     */
/* -------------------------------------------------------------- */

function userFromStorage() {
  try {
    const t = JSON.parse(localStorage.getItem(USER_KEY));
    if (t && t.tok && t.exp && t.exp > Date.now() / 1000 + 60) return t;
  } catch { /* corrupt entry */ }
  localStorage.removeItem(USER_KEY);
  return null;
}

function doLogout(silent) {
  localStorage.removeItem(USER_KEY);
  USER = null;
  PROGRESS = {};
  renderNavUser();
  if (!silent) toast("Logged out");
}

function renderNavUser() {
  /* the profile area inside the hamburger drawer */
  const el = $("#drawerUser");
  if (!el) return;
  if (USER) {
    const letter = (USER.name || "?").charAt(0).toUpperCase();
    el.innerHTML = `
      <div class="drawer-profile">
        <span class="avatar avatar-lg">${esc(letter)}</span>
        <div class="dp-info">
          <b>${esc(USER.name)}</b>
          <span>Profile</span>
        </div>
      </div>
      <button class="btn ghost" id="logoutBtn" style="width:100%">Log Out</button>`;
    $("#logoutBtn").addEventListener("click", () => {
      closeDrawer();
      doLogout();
      route();
    });
  } else {
    el.innerHTML = `
      <div class="drawer-auth">
        <button class="btn ghost" id="drawerLogin">Log In</button>
        <button class="btn primary" id="drawerSignup">Sign Up</button>
      </div>`;
    $("#drawerLogin").addEventListener("click", () => {
      closeDrawer();
      openAuthModal("login");
    });
    $("#drawerSignup").addEventListener("click", () => {
      closeDrawer();
      openAuthModal("signup");
    });
  }
}

function openDrawer() {
  $("#drawer").classList.remove("hidden");
}
function closeDrawer() {
  const d = $("#drawer");
  if (d) d.classList.add("hidden");
}

function toggleSearch() {
  const w = $("#navSearchWrap");
  if (!w) return;
  const opening = w.classList.contains("hidden");
  w.classList.toggle("hidden");
  if (opening) {
    if (location.hash && location.hash !== "#/" && !location.hash.startsWith("#/watch")) {
      location.hash = "#/";
    }
    setTimeout(() => $("#search").focus(), 50);
  }
}

let authTab = "login";

function openAuthModal(tab) {
  authTab = tab || "login";
  $("#authModal").classList.remove("hidden");
  authShowStatus("");
  renderAuthTabs();
  $("#authUser").focus();
}
function closeAuthModal() {
  $("#authModal").classList.add("hidden");
}

function renderAuthTabs() {
  document.querySelectorAll(".auth-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === authTab));
  $("#authGo").textContent = authTab === "login" ? "Log In" : "Sign Up";
  $("#authPass").setAttribute("autocomplete",
    authTab === "login" ? "current-password" : "new-password");
}

function authShowStatus(msg, isError) {
  const s = $("#authStatus");
  s.textContent = msg;
  s.className = "add-status" + (isError ? " error" : "");
  if (!msg) s.classList.add("hidden");
}

async function submitAuth() {
  const btn = $("#authGo");
  const username = $("#authUser").value.trim();
  const password = $("#authPass").value;
  if (!username || !password) {
    authShowStatus("Enter both username and password", true);
    return;
  }
  btn.disabled = true;
  btn.textContent = "Please wait…";
  try {
    const j = await api("/api/auth/" + (authTab === "login" ? "login" : "signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem(USER_KEY, JSON.stringify({
      tok: j.token, exp: j.expires_at, id: j.user.id, name: j.user.name,
    }));
    USER = userFromStorage();
    closeAuthModal();
    $("#authPass").value = "";
    toast(authTab === "login"
      ? "Welcome back, " + esc(j.user.name) + "!"
      : "Profile created — welcome " + esc(j.user.name) + " " + icon("check", 13));
    await loadFiles();
    renderNavUser();
    route();
  } catch (e) {
    authShowStatus(e.message, true);
  } finally {
    btn.disabled = false;
    renderAuthTabs();
  }
}

async function refresh() {
  skeletonHome();
  await loadFiles();
  route();
}

async function boot() {
  window.addEventListener("hashchange", route);

  window.addEventListener("scroll", () => {
    $("#nav").classList.toggle("scrolled", window.scrollY > 24);
  }, { passive: true });

  $("#search").addEventListener("input", () => {
    if (!location.hash || location.hash === "#/") renderHome();
  });

  /* hamburger drawer + search toggle + bottom tabs */
  $("#hamburgerBtn").addEventListener("click", openDrawer);
  $("#drawerClose").addEventListener("click", closeDrawer);
  $("#drawerBackdrop").addEventListener("click", closeDrawer);
  document.querySelectorAll("#drawer [data-close]").forEach(el =>
    el.addEventListener("click", closeDrawer));
  $("#drawerAdd").addEventListener("click", () => {
    closeDrawer();
    openModal();
  });
  $("#searchToggleBtn").addEventListener("click", toggleSearch);

  USER = userFromStorage();
  renderNavUser();
  $("#authCancel").addEventListener("click", closeAuthModal);
  $("#authModal").addEventListener("click", e => {
    if (e.target.id === "authModal") closeAuthModal();
  });
  document.querySelectorAll(".auth-tab").forEach(t =>
    t.addEventListener("click", () => {
      authTab = t.dataset.tab;
      renderAuthTabs();
      authShowStatus("");
    }));
  $("#authGo").addEventListener("click", submitAuth);
  $("#authUser").addEventListener("keydown", e => {
    if (e.key === "Enter") $("#authPass").focus();
  });
  $("#authPass").addEventListener("keydown", e => {
    if (e.key === "Enter") submitAuth();
  });

  $("#cancelAdd").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeModal(); closeAuthModal(); closeDrawer(); aModalClose(); }
  });

  $("#confirmAdd").addEventListener("click", async () => {
    const btn = $("#confirmAdd");
    const fid = $("#fidInput").value.trim();
    if (!fid) { addStatus("file_id is required — paste the Telegram file_id first.", true); return; }
    btn.disabled = true;
    btn.textContent = "Detecting…";
    try {
      const j = await api("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: fid,
          file_name: $("#nameInput").value.trim(),
          file_size: Number($("#sizeInput").value) || 0,
          mime_type: $("#mimeInput").value.trim(),
        }),
      });
      closeModal();
      ["#fidInput", "#nameInput", "#sizeInput", "#mimeInput"].forEach(s => $(s).value = "");
      toast("Added " + icon("check", 13));
      await loadFiles();
      location.hash = "#/watch/" + j.uuid;
      route();
    } catch (e) {
      addStatus(e.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Detect & Add";
    }
  });

  await refresh();
}

boot();
