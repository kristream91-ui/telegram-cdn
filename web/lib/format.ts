export function fmtSize(n?: number) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return v.toFixed(v >= 100 || i === 0 ? 0 : 1) + " " + u[i];
}

export function fmtDur(s?: number) {
  if (!s) return "";
  const t = Math.round(s);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`
    : `${m}:${String(x).padStart(2, "0")}`;
}

/** title without the file extension */
export function displayName(f: { name?: string; uuid?: string }) {
  return String(f.name || f.uuid || "").replace(
    /\.(mp4|m4v|mkv|avi|mov|webm|ts|flv|wmv|mpg|mpeg)$/i, "");
}
