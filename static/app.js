/* ==================================================================
   Ani77 — Netflix-style frontend (vanilla JS, hash routing, no deps)
   ================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");

let FILES = [];
let LOAD_FAILED = false;

/* -------------------------------------------------------------- */
/*  helpers                                                        */
/* -------------------------------------------------------------- */

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
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
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.add("hidden"), 3000);
}

/* continue-watching bookmarks: cw:<uuid> -> {pos, dur} */
function savePos(uuid, player) {
  if (!player || !player.duration || !player.currentTime) return;
  localStorage.setItem(`cw:${uuid}`, JSON.stringify({
    pos: player.currentTime, dur: player.duration, ts: Date.now()
  }));
}
function getPos(uuid) {
  try { return JSON.parse(localStorage.getItem(`cw:${uuid}`)); } catch { return null; }
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
  const ph = img ? "" : `<div class="ph">🎬</div>`;
  return `
    <a class="card" href="#/watch/${f.uuid}" title="${esc(f.name)}">
      <div class="thumb">${img}${ph}
        <div class="play-overlay"><span>▶</span></div>
        ${badge}${progress}
      </div>
      <div class="t">${esc(displayName(f))}</div>
      <div class="m">${fmtSize(f.size)}${codecTag(f)}</div>
    </a>`;
}

function rowHTML(title, files, id) {
  if (!files.length) return "";
  return `
  <section class="row-section">
    <h2>${title} <span class="count">${files.length}</span></h2>
    <div class="row-wrap">
      <button class="row-arrow left" data-row="${id}" aria-label="Scroll left">‹</button>
      <div class="row-scroll" id="row-${id}">${files.map(f => cardHTML(f, true)).join("")}</div>
      <button class="row-arrow right" data-row="${id}" aria-label="Scroll right">‹</button>
    </div>
  </section>`;
}

function brandHeroHTML() {
  return `
  <section class="hero brand-hero">
    <div class="fade"></div>
    <div class="info">
      <img class="brand-logo-lg" src="/static/logo.png" alt="Ani77">
      <h1>Stream Hindi Dub Anime<span class="badge-new">FREE</span></h1>
      <p class="desc">Your personal OTT library, powered by Telegram. Send an MP4 to
        the bot or add it with a file_id — and watch it right here, anywhere.</p>
      <div class="cta">
        <a class="btn gold" href="#" id="heroAdd">＋ Add your first file</a>
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
        <a class="btn primary" href="#/watch/${f.uuid}">▶ Watch now</a>
        <a class="btn ghost" href="/download/${f.uuid}">⬇ Download</a>
      </div>
    </div>
  </section>`;
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
    app.innerHTML = errorBoxHTML("⚠️", "Couldn't reach the server",
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
      <div class="empty"><div class="icon">🔍</div><h3>No results</h3>
      <p>Nothing matches "${esc(q)}".</p></div>`;
    return;
  }

  const watching = FILES.filter(f => started(f.uuid));
  const recent = files.slice(0, 12);
  const hero = files.find(f => f.has_thumb) || files[0];

  app.innerHTML = heroHTML(hero)
    + rowHTML("Continue Watching", watching, "cw")
    + rowHTML(q ? `Results for "${esc(q)}"` : "Recently Added", recent, "recent")
    + `<section class="row-section">
         <h2>All Titles <span class="count">${files.length}</span></h2>
         <div class="grid">${files.map(f => cardHTML(f, true)).join("")}</div>
       </section>`;

  document.querySelectorAll(".row-arrow").forEach(btn => {
    btn.addEventListener("click", () => {
      const el = $("#row-" + btn.dataset.row);
      if (el) el.scrollBy({ left: (btn.classList.contains("right") ? 1 : -1) * el.clientWidth * 0.8, behavior: "smooth" });
    });
  });
}

function errorBoxHTML(icon, title, msg, retry) {
  return `<div class="error-box">
    <div class="icon">${icon}</div>
    <h2>${esc(title)}</h2>
    <p>${esc(msg)}</p>
    ${retry ? '<button class="btn primary" id="retryBtn">↻ Retry</button>' : ""}
  </div>`;
}

async function renderWatch(uuid) {
  if (!uuid) { route(); return; }

  let f;
  try {
    f = await api(`/api/files/${uuid}`);
  } catch (e) {
    app.innerHTML = `<div class="watch-page">` + errorBoxHTML(
      "🚫", "File not found", e.message + " — it may have been removed.", false)
      + `<div style="text-align:center"><a class="btn ghost" href="#/">← Back home</a></div></div>`;
    return;
  }

  const badCodec = /hevc|ac-3|eac-3/i.test(f.codecs || "");
  const banner = badCodec
    ? `<div class="codec-banner">⚠️ <b>Codec: ${esc(f.codecs)}</b> — most browsers can't play this.
       If it doesn't start, download it and watch in MX Player / VLC.</div>` : "";

  app.innerHTML = `
  <div class="watch-page">
    <a href="#/" class="btn ghost" style="margin-bottom:16px; display:inline-flex;">← Back</a>
    ${banner}
    <div class="player-wrap"><video id="player" controls playsinline preload="metadata"
      ${f.has_thumb ? `poster="/thumb/${uuid}"` : ""}
      src="/stream/${uuid}"></video></div>

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
        <a class="btn gold" href="/download/${uuid}">⬇ Download</a>
        <button class="btn ghost" id="copyBtn">🔗 Copy link</button>
      </div>
    </div>

    ${FILES.filter(x => x.uuid !== uuid).length ? `
    <section class="row-section" style="padding-top:26px">
      <h2>More Like This</h2>
      <div class="grid">${FILES.filter(x => x.uuid !== uuid).slice(0, 12).map(x => cardHTML(x, true)).join("")}</div>
    </section>` : ""}
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
    p.addEventListener("error", () => {
      const wrap = p.closest(".player-wrap");
      if (!wrap) return;
      wrap.innerHTML =
        '<div class="error-box" style="aspect-ratio:auto;padding:70px 20px">' +
        '<div class="icon">⚠️</div>' +
        '<h2>Browser could not play this file</h2>' +
        '<p>The codec isn\'t browser-supported' +
        (f.codecs ? " (" + esc(f.codecs) + ")" : "") +
        '. Download it and watch in MX Player / VLC.</p>' +
        '<a class="btn gold" href="/download/' + uuid + '">⬇ Download</a></div>';
    });
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
/*  routing + boot                                                 */
/*-------------- ------------------------------------------------ */

function route() {
  const h = location.hash || "#/";
  if (h.startsWith("#/watch/")) renderWatch(decodeURIComponent(h.split("/")[2] || ""));
  else { renderHome(); window.scrollTo(0, 0); }
}

async function loadFiles() {
  LOAD_FAILED = false;
  try {
    FILES = (await api("/api/files")) || [];
  } catch (e) {
    LOAD_FAILED = true;
    FILES = [];
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

  $("#addBtn").addEventListener("click", openModal);
  $("#cancelAdd").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

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
      toast("Added ✓");
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
