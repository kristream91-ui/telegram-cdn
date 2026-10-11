"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { API_BASE, login, saveUser, signup } from "@/lib/api";

/* rules mirror the API exactly so the user never hits a server error */
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PW = 4;

type Mode = "in" | "up";

function strength(pw: string) {
  let score = 0;
  if (pw.length >= MIN_PW) score++;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(4, score);
  return {
    level,
    label: ["Too short", "Weak", "Fair", "Good", "Strong"][level],
    color: ["bg-white/15", "bg-danger", "bg-[#f0a63a]", "bg-blue-2", "bg-[#2fd18b]"][level],
  };
}

function Field({ label, icon, error, hint, children }: {
  label: string; icon: string; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-semibold uppercase tracking-[1.5px] text-muted">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <Icon name={icon} size={16} />
        </span>
        {children}
      </span>
      {error && (
        <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#ff97a8]">
          <Icon name="alert" size={12} /> {error}
        </span>
      )}
    </label>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => { setServerErr(""); }, [mode]);

  const uErr = useMemo(() => {
    if (!username) return "";
    if (username.length < 3) return "At least 3 characters";
    if (username.length > 20) return "At most 20 characters";
    if (!USERNAME_RE.test(username)) return "Only letters, numbers and _ (no spaces)";
    return "";
  }, [username]);

  const pErr = useMemo(() => {
    if (!password) return "";
    if (password.length < MIN_PW) return `At least ${MIN_PW} characters`;
    return "";
  }, [password]);

  const cErr = useMemo(() => {
    if (mode !== "up" || !confirm) return "";
    return confirm === password ? "" : "Passwords don't match";
  }, [mode, confirm, password]);

  const pw = strength(password);
  const valid = !uErr && !pErr && username.length >= 3 &&
    (mode === "in" || (confirm === password && password.length >= MIN_PW));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, password: true, confirm: true });
    setServerErr("");
    if (!valid) return;
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
      setDone(r.user?.name || username.trim());
      setTimeout(() => router.replace(r.user?.admin ? "/settings" : "/"), 900);
    } catch (err) {
      setServerErr((err as Error).message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[440px] flex-col px-[4vw] pb-12 pt-3">
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${API_BASE}/static/logo.webp`} alt="Ani77"
          className="mx-auto h-[96px] w-[96px] animate-floaty rounded-full object-cover
                     shadow-[0_0_0_3px_rgba(12,132,252,.38),0_0_46px_rgba(12,132,252,.45)]" />
        <h1 className="mt-4 font-display text-[36px] leading-none tracking-[2.5px]">
          ANI<span className="text-accent">77</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[12.5px] leading-relaxed text-muted">
          {mode === "in"
            ? "Welcome back. Sign in to pick up where you left off."
            : "Create a free account — your watch progress syncs across devices."}
        </p>
      </div>

      {/* segmented switcher */}
      <div className="mb-5 flex rounded-2xl border border-line bg-panel2/50 p-1">
        {([["in", "Sign in"], ["up", "Create account"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition
              ${mode === k ? "bg-logo-grad text-white shadow-[0_4px_16px_rgba(12,132,252,.35)]" : "text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card-surface p-5">
        <Field label="Username" icon="user"
          hint={mode === "up" ? `${username.length}/20` : undefined}
          error={touched.username ? uErr : ""}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
            onBlur={() => setTouched(t => ({ ...t, username: true }))}
            autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
            autoComplete="username" placeholder="your_name"
            aria-invalid={!!uErr}
            className={`field pl-10 ${touched.username && uErr ? "border-danger/60" : ""}`}
          />
        </Field>

        <Field label="Password" icon="key"
          error={touched.password ? pErr : ""}>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, password: true }))}
            type={show ? "text" : "password"}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="••••••••"
            aria-invalid={!!pErr}
            className={`field pl-10 pr-11 ${touched.password && pErr ? "border-danger/60" : ""}`}
          />
          <button type="button" onClick={() => setShow(s => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink">
            <Icon name={show ? "eyeOff" : "eye"} size={17} />
          </button>
        </Field>

        {mode === "up" && (
          <>
            {/* strength meter */}
            <div className="-mt-2 mb-4">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <span key={i}
                    className={`h-1 flex-1 rounded-full transition ${i <= pw.level ? pw.color : "bg-white/10"}`} />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px]">
                <span className="text-muted">Password strength</span>
                <span className={pw.level >= 3 ? "text-accent" : "text-muted"}>{password ? pw.label : ""}</span>
              </div>
            </div>

            <Field label="Confirm password" icon="key"
              error={touched.confirm ? cErr : ""}>
              <input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                type={show2 ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!cErr}
                className={`field pl-10 pr-11 ${touched.confirm && cErr ? "border-danger/60" : ""}`}
              />
              <button type="button" onClick={() => setShow2(s => !s)}
                aria-label={show2 ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink">
                <Icon name={show2 ? "eyeOff" : "eye"} size={17} />
              </button>
              {confirm && !cErr && (
                <span className="absolute -bottom-5 left-1 flex items-center gap-1 text-[11px] text-[#2fd18b]">
                  <Icon name="check" size={12} /> Passwords match
                </span>
              )}
            </Field>
          </>
        )}

        {serverErr && (
          <div className="mt-1 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12.5px] text-[#ffc7d1]">
            <Icon name="alert" size={15} />
            <span>{serverErr}</span>
          </div>
        )}

        <button type="submit"
          disabled={busy || !!done || !username || !password || (mode === "up" && !confirm)}
          className="btn-primary mt-5 w-full py-3.5 text-[14px]">
          {done ? (
            <><Icon name="check" size={16} /> Signed in as {done}</>
          ) : busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {mode === "in" ? "Signing in…" : "Creating account…"}
            </>
          ) : (
            mode === "in" ? "Sign in" : "Create account"
          )}
        </button>

        <p className="mt-3.5 text-center text-[11.5px] text-muted">
          {mode === "in" ? "New to Ani77?" : "Already have an account?"}{" "}
          <button type="button" className="font-semibold text-accent hover:underline"
            onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Create an account" : "Sign in instead"}
          </button>
        </p>
      </form>

      <Link href="/" className="btn-quiet mx-auto mt-5 px-4 py-2 text-[13px]">
        <Icon name="arrowL" size={15} /> Continue as guest
      </Link>

      <div className="mt-6 rounded-2xl border border-line bg-panel2/40 p-3.5">
        <p className="text-[11.5px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">Admin?</span> Sign in with your admin username
          and password — the admin panel then unlocks in Settings.
        </p>
      </div>
    </div>
  );
}
