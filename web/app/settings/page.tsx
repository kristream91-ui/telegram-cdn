"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { loadAdminToken, loadUser, logout as clearUser } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

const RATE_KEY = "ani_rate";
const VOL_KEY = "ani_vol";
const AUTONEXT_KEY = "ani_autonext";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-none rounded-full transition ${on ? "bg-logo-grad" : "bg-panel2 border border-line"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Row({ icon, title, sub, children }: {
  icon: string; title: string; sub?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3.5 last:border-0">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-panel2/70 text-accent">
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        {sub && <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{sub}</span>}
      </span>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[2px] text-muted">{title}</h2>
      <div className="card-surface overflow-hidden">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [admin, setAdmin] = useState(false);
  const [rate, setRate] = useState("1");
  const [vol, setVol] = useState("1");
  const [autonext, setAutonext] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setUser(loadUser());
    setAdmin(!!loadAdminToken());
    try {
      setRate(localStorage.getItem(RATE_KEY) || "1");
      setVol(localStorage.getItem(VOL_KEY) || "1");
      setAutonext(localStorage.getItem(AUTONEXT_KEY) !== "0");
    } catch { /* ignore */ }
  }, []);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };
  const put = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

  return (
    <div className="mx-auto max-w-[760px] px-[4vw] pb-10">
      <h1 className="section-title mb-4 mt-2">Settings</h1>

      <Card title="Account">
        <Row icon="user" title={user?.name || "Guest"}
          sub={user ? "Progress syncs across your devices" : "Sign in to sync your watch progress"}>
          {user ? (
            <button className="btn-quiet px-3 py-1.5 text-[12.5px]"
              onClick={() => { clearUser(); setUser(null); flash("Signed out"); }}>
              Log out
            </button>
          ) : (
            <Link href="/login" className="btn-primary px-3.5 py-1.5 text-[12.5px]">Sign in</Link>
          )}
        </Row>
        {admin && (
          <Row icon="shield" title="Admin panel" sub="Add files, manage episodes and series">
            <Link href="/admin" className="btn-ghost px-3 py-1.5 text-[12.5px]">Open</Link>
          </Row>
        )}
      </Card>

      <Card title="Playback">
        <Row icon="play" title="Default speed" sub="Used when an episode starts">
          <select value={rate} onChange={e => { setRate(e.target.value); put(RATE_KEY, e.target.value); flash("Speed saved"); }}
            className="rounded-xl border border-line bg-panel2/70 px-3 py-1.5 text-[13px] outline-none">
            {["0.5", "0.75", "1", "1.25", "1.5", "2"].map(r => <option key={r} value={r}>{r}×</option>)}
          </select>
        </Row>
        <Row icon="sliders" title="Default volume" sub={`${Math.round(parseFloat(vol) * 100)}%`}>
          <input type="range" min={0} max={1} step={0.05} value={vol}
            onChange={e => { setVol(e.target.value); put(VOL_KEY, e.target.value); }}
            className="h-1 w-28 accent-blue-2" aria-label="Default volume" />
        </Row>
        <Row icon="next" title="Autoplay next episode" sub="Play the next episode automatically">
          <Toggle on={autonext} onChange={v => { setAutonext(v); put(AUTONEXT_KEY, v ? "1" : "0"); }} />
        </Row>
      </Card>

      <Card title="Data">
        <Row icon="download" title="Downloads" sub="Every file is streamed from your Telegram bot">
          <Link href="/downloads" className="btn-ghost px-3 py-1.5 text-[12.5px]">Open</Link>
        </Row>
        <Row icon="close" title="Clear local preferences" sub="Resets volume, speed and search history on this device">
          <button className="btn-quiet px-3 py-1.5 text-[12.5px]"
            onClick={() => {
              [RATE_KEY, VOL_KEY, AUTONEXT_KEY, "ani_recent_search"].forEach(k => localStorage.removeItem(k));
              setRate("1"); setVol("1"); setAutonext(true);
              flash("Local data cleared");
            }}>
            Clear
          </button>
        </Row>
      </Card>

      <Card title="About">
        <Row icon="shield" title="Ani77" sub="Your own OTT library, powered by Telegram (Pyrogram). Nothing is re-hosted." />
        <Row icon="link" title="Backend" sub="Python · FastAPI · Pyrogram bot" />
        <Row icon="tv" title="Frontend" sub="Next.js 14 · React 18 · Tailwind CSS 3 · TypeScript" />
      </Card>

      <p className="pb-4 text-center text-[11.5px] text-muted">Ani77 · Powered by Telegram</p>

      {toast && (
        <div className="fixed inset-x-0 bottom-[92px] z-[60] flex justify-center">
          <span className="rounded-full border border-line bg-[rgba(8,18,40,.96)] px-4 py-2 text-[12.5px] text-accent shadow-soft">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
