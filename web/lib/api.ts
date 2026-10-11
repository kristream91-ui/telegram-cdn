import type { MediaFile, SeriesMeta, SessionUser } from "./types";

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8123").replace(/\/$/, "");

export const USER_KEY = "userTok";
export const ADMIN_KEY = "adminTok";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, init);
  } catch {
    throw new ApiError("Network error — is the server awake?", 0);
  }
  let body: any = null;
  try { body = await res.json(); } catch { /* empty / non-JSON */ }
  if (!res.ok) {
    const d = body?.detail;
    throw new ApiError(typeof d === "string" ? d : `HTTP ${res.status}`, res.status);
  }
  return body as T;
}

/* ---------------- public API ---------------- */

export const getFiles = () => request<MediaFile[]>("/api/files");
export const getSeries = () => request<SeriesMeta[]>("/api/series");
export const getFile = (uuid: string) => request<MediaFile>(`/api/files/${uuid}`);
export const thumbUrl = (uuid: string) => `${API_BASE}/thumb/${uuid}`;
export const posterUrl = (name: string) => `${API_BASE}/poster/${encodeURIComponent(name)}`;
export const bannerUrl = (name: string) => `${API_BASE}/banner/${encodeURIComponent(name)}`;
export const streamUrl = (uuid: string) => `${API_BASE}/stream/${uuid}`;
export const downloadUrl = (uuid: string) => `${API_BASE}/download/${uuid}`;

/* ---------------- auth ---------------- */

export function loadUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const t = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (t?.tok && t.exp > Date.now() / 1000 + 60) return t as SessionUser;
  } catch { /* corrupt */ }
  localStorage.removeItem(USER_KEY);
  return null;
}

export function saveUser(u: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export function loadAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const t = JSON.parse(localStorage.getItem(ADMIN_KEY) || "null");
    if (t?.tok && t.exp > Date.now() / 1000 + 60) return t.tok as string;
  } catch { /* corrupt */ }
  localStorage.removeItem(ADMIN_KEY);
  return null;
}

export function saveAdminToken(tok: string, exp: number) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify({ tok, exp }));
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_KEY);
}

export async function login(username: string, password: string) {
  return request<{ token: string; expires_at: number; user: any }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function signup(username: string, password: string) {
  return request<{ token: string; expires_at: number; user: any }>("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function getProgress(tok: string) {
  return request<Record<string, { pos: number; dur: number }>>("/api/progress", {
    headers: { Authorization: "Bearer " + tok },
  });
}

export async function saveProgress(tok: string, uuid: string, pos: number, dur: number) {
  return request<{ ok: boolean }>(`/api/progress/${uuid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
    body: JSON.stringify({ pos, dur }),
  });
}
