"use client";
import { useCallback, useEffect, useState } from "react";
import { getProgress, loadUser, saveProgress } from "./api";
import type { Progress, SessionUser } from "./types";

/** the signed-in user, read from localStorage on mount */
export function useUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => { setUser(loadUser()); }, []);
  return [user, setUser] as const;
}

/** watch-progress map + a save() that writes through to the API */
export function useProgress(user: SessionUser | null) {
  const [map, setMap] = useState<Progress>({});

  useEffect(() => {
    if (!user) { setMap({}); return; }
    let alive = true;
    getProgress(user.tok)
      .then(p => { if (alive) setMap(p || {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  const save = useCallback((uuid: string, pos: number, dur: number) => {
    setMap(m => ({ ...m, [uuid]: { pos, dur } }));
    if (user) saveProgress(user.tok, uuid, pos, dur).catch(() => {});
  }, [user]);

  return { map, save };
}
