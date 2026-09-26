/* ==================================================================
   Ani77 — Netflix-style frontend (vanilla JS, hash routing, no deps)
   ================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");

let FILES = [];
let SERIES = [];   // series content details (/api/series)
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

/* group files into series: [{name, eps: [files sorted], latest, poster, thumbUuid}] */
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
    : `<div class="ph">📺</div>`;
  return `
    <a class="card series-card" href="#/series/${encodeURIComponent(s.name)}" title="${esc(s.name)}">
      <div class="thumb">${inner}
        <div class="play-overlay"><span>▶</span></div>
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
  const ph = img ? "" : `<div class="ph">${f.series ? "📺" : "🎬"}</div>`;
  const ep = f.series && f.episode ? ` · <b>S${f.season || 1}E${f.episode}</b>` : "";
  return `
    <a class="card" href="#/watch/${f.uuid}" title="${esc(f.name)}">
      <div class="thumb">${img}${ph}
        <div class="play-overlay"><span>▶</span></div>
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
      <img class="brand-logo-lg" src="/static/logo.webp" alt="Ani77">
      <h1>Stream Hindi Dub Anime<span class="badge-new">FREE</span></h1>
      <p class="desc">Your personal OTT library, powered by Telegram. Send an MP4 or TS
        file to the bot or add it with a file_id — and watch it right here, anywhere.</p>
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
  const series = buildSeries(files);
  const standalone = files.filter(f => !f.series);

  app.innerHTML = heroHTML(hero)
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
}

function errorBoxHTML(icon, title, msg, retry) {
  return `<div class="error-box">
    <div class="icon">${icon}</div>
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
  const back = meta.has_poster
    ? `/poster/${encodeURIComponent(name)}`
    : ((eps.find(e => e.has_thumb) || {}).uuid ? `/thumb/${eps.find(e => e.has_thumb).uuid}` : "");

  app.innerHTML = `
  <div class="watch-page">
    <a href="#/" class="btn ghost" style="margin-bottom:16px; display:inline-flex;">← Back</a>
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
          <a class="btn primary" href="#/watch/${first.uuid}">▶ ${cont ? "Continue E" + (cont.episode || "?") : "Play E1"}</a>
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
          <span class="ep-play">▶</span>
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
      "🚫", "File not found", e.message + " — it may have been removed.", false)
      + `<div style="text-align:center"><a class="btn ghost" href="#/">← Back home</a></div></div>`;
    return;
  }

  const badCodec = /hevc|ac-3|eac-3/i.test(f.codecs || "");
  const isTS = (f.mime || "").toLowerCase() === "video/mp2t";
  const banner = badCodec
    ? `<div class="codec-banner">⚠️ <b>Codec: ${esc(f.codecs)}</b> — most browsers can't play this.
       If it doesn't start, download it and watch in MX Player / VLC.</div>` : "";

  app.innerHTML = `
  <div class="watch-page">
    <a href="#/" class="btn ghost" style="margin-bottom:16px; display:inline-flex;">← Back</a>
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
        <a class="btn gold" href="/download/${uuid}">⬇ Download</a>
        <button class="btn ghost" id="copyBtn">🔗 Copy link</button>
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
        '<div class="icon">⚠️</div>' +
        '<h2>' + title + '</h2>' +
        '<p>' + msg + '</p>' +
        '<a class="btn gold" href="/download/' + uuid + '">⬇ Download</a></div>';
    }

    if (isTS) {
      /* MPEG-TS container (anime files are often TS renamed to .mp4) —
         the browser can't play it natively, so pipe it through mpegts.js */
      if (window.mpegts && mpegts.getFeatureList().networkStreamIO) {
        const player = mpegts.createPlayer(
          { type: "mpegts", isLive: false, url: "/stream/" + uuid });
        player.attachMediaElement(p);
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

async function renderAdmin() {
  document.title = "Admin — Ani77";
  const tok = adminTok();

  if (!tok) {
    app.innerHTML = `
    <div class="admin-page">
      <div class="modal-box" style="max-width:400px;margin:8vh auto 0">
        <h2>🛡️ Admin Login</h2>
        <p class="hint">Only the admin can manage the library.</p>
        <label>Password</label>
        <input id="adminPw" type="password" placeholder="••••••••" autocomplete="current-password">
        <div id="adminStatus" class="add-status hidden"></div>
        <div class="modal-actions">
          <a class="btn ghost" href="#/">← Back</a>
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
        toast("Admin login ✓");
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
    <a href="#/" class="btn ghost" style="margin-bottom:16px;display:inline-flex;">← Back to site</a>
    <h1 class="admin-title">🛡️ Admin Panel</h1>
    <div id="adminStats" class="stat-grid"></div>
    <div class="watch-head" style="margin-top:10px;">
      <h2 style="margin:0;">📺 Content Details <span class="count" id="sCount"></span></h2>
    </div>
    <div id="adminSeries"></div>
    <div class="watch-head" style="margin-top:26px;">
      <h2 style="margin:0;">Files <span class="count" id="aCount"></span></h2>
      <button id="adminLogout" class="btn ghost">Logout</button>
    </div>
    <div id="adminList"></div>
  </div>`;

  $("#adminLogout").addEventListener("click", () => {
    localStorage.removeItem(ADMIN_KEY);
    toast("Logged out");
    location.hash = "#/";
    route();
  });

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

  let seriesList = [];
  try { seriesList = (await api("/api/series")) || []; } catch { /* ok */ }
  SERIES = seriesList;
  $("#sCount").textContent = seriesList.length;
  $("#adminSeries").innerHTML = seriesList.length ? `<table class="admin-table">
    <thead><tr><th>Series</th><th>Year</th><th>Genre</th><th>Description</th><th></th></tr></thead>
    <tbody>${seriesList.map(s => `
      <tr>
        <td class="name">${s.has_poster ? `<img src="/poster/${encodeURIComponent(s.name)}" loading="lazy" style="height:34px;border-radius:6px;margin-right:10px;vertical-align:middle;object-fit:cover;" onerror="this.remove()">` : ""}<b>${esc(s.name)}</b><div style="font-size:11px;color:var(--muted);">${s.episodes} eps · ${s.seasons.length || 1} season${(s.seasons.length || 1) > 1 ? "s" : ""}</div></td>
        <td>${esc(s.year || "—")}</td>
        <td>${esc(s.genre || "—")}</td>
        <td style="font-weight:400;">${esc(s.description ? s.description.slice(0, 60) + (s.description.length > 60 ? "…" : "") : "—")}</td>
        <td class="ops"><button class="btn small" data-meta="${esc(s.name)}">✏️ Edit</button></td>
      </tr>`).join("")}</tbody></table>`
    : `<div class="empty" style="padding:16px"><p>No series yet — files with SxxExx in the name (e.g. Tensura S4E1.mp4) are grouped automatically.</p></div>`;

  document.querySelectorAll("[data-meta]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.meta;
      const s = seriesList.find(x => x.name === name) || { name, description: "", year: "", genre: "" };
      const tr = btn.closest("tr");
      tr.innerHTML = `<td colspan="5">
        <div class="meta-edit">
          <div class="mrow"><label>Release year</label><input id="mYear" value="${esc(s.year || "")}" placeholder="2025"></div>
          <div class="mrow"><label>Genre</label><input id="mGenre" value="${esc(s.genre || "")}" placeholder="Action, Fantasy, Isekai"></div>
          <div class="mrow"><label>Description</label><textarea id="mDesc" rows="3" placeholder="Anime story / description...">${esc(s.description || "")}</textarea></div>
          <div class="mrow"><label>Poster image (JPG / PNG / WEBP, 2 MB max)</label>
            <input id="mPoster" type="file" accept="image/*" style="padding:6px;">
            ${s.has_poster ? `<div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
              <img src="/poster/${encodeURIComponent(name)}" style="height:64px;border-radius:8px;" onerror="this.remove()">
              <button class="btn small danger" id="mPosterDel">🗑️ Remove poster</button></div>`
            : `<div style="font-size:11.5px;color:var(--muted);margin-top:6px;">No poster yet — episode thumbnail (if any) is used instead.</div>`}
          </div>
          <div class="modal-actions">
            <button class="btn ghost" id="mCancel">Cancel</button>
            <button class="btn primary" id="mSave">Save details</button>
          </div>
        </div></td>`;
      $("#mCancel").addEventListener("click", () => renderAdmin());
      const pdel = $("#mPosterDel");
      if (pdel) pdel.addEventListener("click", async () => {
        try {
          await adminApi("/api/series/" + encodeURIComponent(name) + "/poster", { method: "DELETE" });
          toast("Poster removed ✓");
          renderAdmin();
        } catch (e) { toast(e.message); }
      });
      $("#mSave").addEventListener("click", async () => {
        const btn2 = $("#mSave");
        const posterFile = $("#mPoster").files[0];
        try {
          if (posterFile) {
            btn2.disabled = true; btn2.textContent = "Uploading…";
            const fd = new FormData();
            fd.append("poster", posterFile);
            await adminApi("/api/series/" + encodeURIComponent(name) + "/poster",
              { method: "POST", body: fd });
            btn2.textContent = "Saving…";
          }
          await adminApi("/api/series/" + encodeURIComponent(name), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year: $("#mYear").value.trim(),
              genre: $("#mGenre").value.trim(),
              description: $("#mDesc").value.trim(),
            }),
          });
          toast("Details saved ✓");
          await loadFiles();
          renderAdmin();
        } catch (e) { toast(e.message); btn2.disabled = false; btn2.textContent = "Save details"; }
      });
    });
  });

  let files = [];
  try { files = (await api("/api/files")) || []; } catch { /* keep empty */ }
  $("#aCount").textContent = files.length;
  if (!files.length) {
    $("#adminList").innerHTML = `<div class="empty" style="padding:30px"><div class="icon">🎬</div><h3>No files yet</h3>
      <p>Add files with the ＋ Add button or by sending them to the bot.</p></div>`;
    return;
  }
  $("#adminList").innerHTML = `<table class="admin-table">
    <thead><tr><th>Name</th><th>Group</th><th>Size</th><th>Format</th><th></th></tr></thead>
    <tbody>${files.map(f => `
      <tr>
        <td class="name">${esc(f.name || f.uuid)}</td>
        <td>${f.series ? `S${f.season || 1} · E${f.episode || "?"}` : "—"}</td>
        <td>${fmtSize(f.size)}</td>
        <td>${esc(f.mime || "—")}</td>
        <td class="ops">
          <button class="btn small" data-act="group" data-uuid="${f.uuid}" data-series="${esc(f.series || "")}" data-season="${f.season || 1}" data-episode="${f.episode || 1}">🏷️ Group</button>
          <button class="btn small" data-act="rename" data-uuid="${f.uuid}" data-name="${esc(f.name || "")}">✏️ Rename</button>
          <button class="btn small danger" data-act="del" data-uuid="${f.uuid}">🗑️ Delete</button>
        </td>
      </tr>`).join("")}</tbody></table>`;

  document.querySelectorAll(".admin-table [data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uuid = btn.dataset.uuid;
      if (btn.dataset.act === "rename") {
        const name = prompt("New name (with extension, e.g. Movie.mp4):", btn.dataset.name || "");
        if (!name || !name.trim() || name.trim() === btn.dataset.name) return;
        btn.disabled = true;
        try {
          await adminApi("/api/files/" + uuid, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_name: name.trim() }),
          });
          toast("Renamed ✓");
          renderAdmin();
        } catch (e) { toast(e.message); btn.disabled = false; }
      } else if (btn.dataset.act === "group") {
        const series = prompt("Series name (empty = standalone movie):", btn.dataset.series || "");
        if (series === null) return;
        const season = prompt("Season number:", btn.dataset.season || "1");
        if (season === null) return;
        const episode = prompt("Episode number:", btn.dataset.episode || "1");
        if (episode === null) return;
        btn.disabled = true;
        try {
          await adminApi("/api/files/" + uuid, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              series: series.trim(),
              season: Number(season) || 0,
              episode: Number(episode) || 0,
            }),
          });
          toast("Grouping saved ✓");
          renderAdmin();
        } catch (e) { toast(e.message); btn.disabled = false; }
      } else {
        if (!confirm("Delete this file from the library?")) return;
        btn.disabled = true;
        try {
          await adminApi("/api/files/" + uuid, { method: "DELETE" });
          toast("Deleted ✓");
          renderAdmin();
        } catch (e) { toast(e.message); btn.disabled = false; }
      }
    });
  });
}

/* -------------------------------------------------------------- */
/*  routing + boot                                                 */
/* -------------------------------------------------------------- */

function route() {
  const h = location.hash || "#/";
  if (h.startsWith("#/watch/")) renderWatch(decodeURIComponent(h.split("/")[2] || ""));
  else if (h.startsWith("#/series/")) renderSeries(decodeURIComponent(h.split("/")[2] || ""));
  else if (h.startsWith("#/admin")) renderAdmin();
  else {
    document.title = "Ani77 — Stream Hindi Dub Anime";
    renderHome();
    window.scrollTo(0, 0);
  }
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
