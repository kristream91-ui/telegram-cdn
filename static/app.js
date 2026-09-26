/* StreamVault frontend — vanilla JS, hash routing, zero dependencies */

const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");

let FILES = [];
let activeKind = "all";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

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

function kindOf(f) {
  const m = f.mime || "";
  if (m.startsWith("video")) return "video";
  if (m.startsWith("audio")) return "audio";
  if (m.startsWith("image")) return "image";
  return "doc";
}

function iconOf(f) {
  return { video: "🎬", audio: "🎵", image: "🖼️", doc: "📦" }[kindOf(f)];
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.add("hidden"), 2600);
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

/* ------------------------------------------------------------------ */
/*  rendering                                                          */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
}

function cardHTML(f, showProgress = false) {
  let progress = "";
  if (showProgress) {
    const p = getPos(f.uuid);
    if (p && p.pos > 10 && p.pos < p.dur - 30) {
      progress = `<div class="progress"><i style="width:${(p.pos / p.dur * 100).toFixed(1)}%"></i></div>`;
    }
  }
  const badge = f.duration
    ? `<span class="badge${kindOf(f) === "audio" ? " music" : ""}">${fmtDur(f.duration)}</span>` : "";
  const img = f.has_thumb
    ? `<img src="/thumb/${f.uuid}" loading="lazy"
           onerror="this.remove()">` : "";
  return `
    <a class="card" href="#/watch/${f.uuid}">
      <div class="poster">${iconOf(f)}${img}${badge}</div>
      ${progress}
      <div class="title" title="${esc(f.name)}">${esc(f.name)}</div>
      <div class="sub">${fmtSize(f.size)} · ${kindOf(f)}</div>
    </a>`;
}

function renderHome() {
  const q = $("#search").value.trim().toLowerCase();
  const kind = activeKind;

  let files = FILES.filter(f =>
    (!q || f.name.toLowerCase().includes(q) || (f.caption || "").toLowerCase().includes(q)));
  if (kind !== "all") files = files.filter(f => kindOf(f) === kind);

  const hero = files.find(f => kindOf(f) === "video") || files[0];
  const watching = FILES.filter(f => {
    const p = getPos(f.uuid);
    return p && p.pos > 10 && p.pos < p.dur - 30;
  });

  let html = "";

  if (hero) {
    html += `
    <section class="hero">
      ${hero.has_thumb ? `<img class="backdrop" src="/thumb/${hero.uuid}" onerror="this.remove()">` : ""}
      <div class="fade"></div>
      <div class="info">
        <h1>${esc(hero.name)}</h1>
        <p>${esc(hero.caption || hero.mime || "Streamed straight from Telegram")}</p>
        <div class="meta">${fmtSize(hero.size)}
          ${hero.duration ? " · " + fmtDur(hero.duration) : ""} · ${kindOf(hero)}</div>
        <div style="margin-top:18px; display:flex; gap:10px;">
          <a class="btn primary" href="#/watch/${hero.uuid}">▶ Watch now</a>
          <a class="btn ghost" href="/download/${hero.uuid}">⬇ Download</a>
        </div>
      </div>
    </section>`;
  }

  if (watching.length) {
    html += `<section class="section"><h2>Continue watching</h2>
      <div class="row-scroll">${watching.map(f => cardHTML(f, true)).join("")}</div></section>`;
  }

  html += `<section class="section">
    <h2>All movies</h2>
    ${files.length
      ? `<div class="grid">${files.map(f => cardHTML(f, true)).join("")}</div>`
      : `<div class="empty"><h3>Nothing here yet</h3>
         <p>Send an MP4 to the bot on Telegram, or paste a file_id with the ＋ Add button.</p></div>`}
  </section>`;

  app.innerHTML = html;
}

async function renderWatch(uuid) {
  let f;
  try {
    const r = await fetch(`/api/files/${uuid}`);
    if (!r.ok) throw 0;
    f = await r.json();
  } catch {
    app.innerHTML = `<div class="empty"><h3>404</h3><p>This file isn't in the catalog.</p>
      <p><a class="btn ghost" href="#/" style="margin-top:14px">← Back home</a></p></div>`;
    return;
  }

  const k = kindOf(f);
  let player = "";

  if (k === "video") {
    player = `<div class="player-wrap"><video id="player" controls playsinline preload="metadata"
      ${f.has_thumb ? `poster="/thumb/${uuid}"` : ""}
      src="/stream/${uuid}"></video></div>`;
  } else if (k === "audio") {
    player = `<div class="player-wrap" style="padding:30px 20px; background:linear-gradient(135deg,#1b2540,#131a2a)">
      <div style="text-align:center; font-size:52px; margin-bottom:16px;">🎵</div>
      <audio id="player" controls style="margin:0 auto; width:100%;">src</audio></div>`;
  } else if (k === "image") {
    player = `<div class="player-wrap"><img src="/stream/${uuid}" alt="${esc(f.name)}"></div>`;
  } else {
    player = `<div class="fallback">
      <div class="icon">📦</div>
      <h3>${esc(f.name)}</h3>
      <p>${f.mime || "File"} · ${fmtSize(f.size)}</p>
      <a class="btn primary" href="/download/${uuid}">⬇ Download</a></div>`;
  }

  const badCodec = /hevc|ac-3|eac-3/i.test(f.codecs || "");
  const banner = badCodec
    ? `<div style="margin-top:14px; padding:12px 16px; border-radius:10px;
         background:rgba(244,63,94,.12); border:1px solid rgba(244,63,94,.35); font-size:13.5px;">
         ⚠️ Codec: ${esc(f.codecs)} — aksar browsers isse play nahi kar paate.
         Play na ho to download karke MX Player / VLC mein dekho.</div>` : "";

  app.innerHTML = `
    <a href="#/" class="btn ghost" style="margin-top:18px; display:inline-block;">← Back</a>
    ${banner}
    ${player}
    <div class="watch-head">
      <div>
        <h1>${esc(f.name)}</h1>
        <div class="meta">${fmtSize(f.size)} · ${f.mime || "unknown"}
          ${f.codecs ? " · " + esc(f.codecs) : ""}
          ${f.duration ? " · " + fmtDur(f.duration) : ""}
          · ${new Date(f.created_at * 1000).toLocaleDateString()}</div>
        ${f.caption ? `<div class="caption">${esc(f.caption)}</div>` : ""}
      </div>
      <div class="actions">
        <a class="btn primary" href="/download/${uuid}">⬇ Download</a>
        <button class="btn ghost" id="copyBtn">🔗 Copy link</button>
      </div>
    </div>
    <section class="section"><h2>More like this</h2>
      <div class="grid">${FILES.filter(x => x.uuid !== uuid).slice(0, 12).map(x => cardHTML(x)).join("") || '<p class="meta">—</p>'}</div>
    </section>`;

  const p = $("#player");
  if (p) {
    const saved = getPos(uuid);
    if (saved && saved.pos > 10 && saved.pos < (saved.dur || Infinity) - 30) {
      p.addEventListener("loadedmetadata", () => { p.currentTime = saved.pos; });
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
        '<div style="padding:44px 20px; text-align:center;">' +
        '<div style="font-size:44px; margin-bottom:10px;">⚠️</div>' +
        '<div style="font-weight:700; font-size:16px; margin-bottom:6px;">Browser ye file play nahi kar saka</div>' +
        '<div style="color:#8a95a8; font-size:13px;">File ka codec browser-supported nahi hai' +
        (f.codecs ? " (" + esc(f.codecs) + ")" : "") +
        '. Download karke MX Player / VLC mein dekho.</div></div>';
    });
  }

  $("#copyBtn").addEventListener("click", async () => {
    const link = location.origin + "/#/watch/" + uuid;
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied!");
    } catch {
      prompt("Copy this link:", link);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  routing + boot                                                     */
/* ------------------------------------------------------------------ */

function route() {
  const h = location.hash || "#/";
  if (h.startsWith("#/watch/")) renderWatch(h.split("/")[2]);
  else renderHome();
}

async function boot() {
  try {
    FILES = await (await fetch("/api/files")).json();
  } catch { FILES = []; }

  window.addEventListener("hashchange", route);
  $("#search").addEventListener("input", () => {
    if (!location.hash || location.hash === "#/") renderHome();
  });

  $("#addBtn").addEventListener("click", () => $("#modal").classList.remove("hidden"));
  $("#cancelAdd").addEventListener("click", () => $("#modal").classList.add("hidden"));
  $("#modal").addEventListener("click", e => {
    if (e.target.id === "modal") $("#modal").classList.add("hidden");
  });

  $("#confirmAdd").addEventListener("click", async () => {
    const body = {
      file_id: $("#fidInput").value.trim(),
      file_name: $("#nameInput").value.trim(),
      file_size: Number($("#sizeInput").value) || 0,
      mime_type: $("#mimeInput").value.trim(),
    };
    if (!body.file_id) return toast("file_id is required");
    const r = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) return toast(j.detail || "Failed");
    FILES = await (await fetch("/api/files")).json();
    $("#modal").classList.add("hidden");
    $("#fidInput").value = $("#nameInput").value = $("#sizeInput").value = $("#mimeInput").value = "";
    toast("Added ✓");
    location.hash = "#/watch/" + j.uuid;
  });

  route();
}

boot();
