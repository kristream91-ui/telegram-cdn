"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { API_BASE, login, saveUser, signup } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { setErr(""); }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (username.trim().length < 3) return setErr("Username must be at least 3 characters.");
    if (password.length < 4) return setErr("Password must be at least 4 characters.");
    setBusy(true);
    try {
      const r = mode === "in"
        ? await login(username.trim(), password)
        : await signup(username.trim(), password);
      saveUser({
        id: r.user?.id ?? 0,
        name: r.user?.name || username.trim(),
        tok: r.token,
        exp: r.expires_at,
        admin: !!r.user?.admin,
      });
      router.replace("/");
    } catch (e) {
      setErr((e as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[460px] flex-col px-[4vw] pb-10 pt-4">
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${API_BASE}/static/logo.webp`} alt="Ani77"
          className="mx-auto h-[92px] w-[92px] animate-floaty rounded-full object-cover
                     shadow-[0_0_0_3px_rgba(12,132,252,.35),0_0_44px_rgba(12,132,252,.45)]" />
        <h1 className="mt-4 font-display text-[34px] leading-none tracking-[2px]">
          ANI<span className="text-accent">77</span>
        </h1>
        <p className="mt-2 text-[13px] text-muted">
          {mode === "in" ? "Welcome back — sign in to sync your progress." : "Create an account to save where you left off."}
        </p>
      </div>

      <div className="mb-5 flex rounded-2xl border border-line bg-panel2/50 p-1">
        {([["in", "Sign in"], ["up", "Create account"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition
              ${mode === k ? "bg-logo-grad text-white shadow-[0_4px_16px_rgba(12,132,252,.35)]" : "text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card-surface p-4">
        <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-widest text-muted">
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="user" size={16} />
          </span>
          <input value={username} onChange={e => setUsername(e.target.value)}
            autoComplete="username" placeholder="your name" className="field pl-11" />
        </div>

        <label className="mb-1.5 mt-4 block text-[12px] font-semibold uppercase tracking-widest text-muted">
          Password
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="shield" size={16} />
          </span>
          <input value={password} onChange={e => setPassword(e.target.value)}
            type={show ? "text" : "password"} autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="••••••" className="field pl-11 pr-12" />
          <button type="button" aria-label="Show password" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
            <Icon name={show ? "close" : "search"} size={16} />
          </button>
        </div>

        {err && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12.5px] text-[#ffc7d1]">
            <Icon name="alert" size={15} />
            <span>{err}</span>
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full py-3">
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>

        <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted">
          {mode === "in" ? "New here?" : "Already have an account?"}{" "}
          <button type="button" className="text-accent hover:underline"
            onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Create an account" : "Sign in instead"}
          </button>
        </p>
      </form>

      <Link href="/" className="btn-quiet mx-auto mt-5 px-4 py-2 text-[13px]">
        <Icon name="arrowL" size={15} /> Continue as guest
      </Link>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
        Admin? Sign in with your admin username and password to unlock the admin panel.
      </p>
    </div>
  );
}
