"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "./api";
import {
  type Profile,
  accountLogin,
  accountLogout,
  accountRefresh,
  accountSignup,
} from "./accounts-api";

type Status = "loading" | "out" | "in";

interface AccountValue {
  status: Status;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (b: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  /** With `to`, leaves the site section with a full page load, so nothing bounces to the login page. */
  logout: (to?: string) => Promise<void>;
  setProfile: (p: Profile) => void;
  /** Runs an authenticated call; if the 15-minute token has expired it refreshes once and retries. */
  authed: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

const Ctx = createContext<AccountValue | null>(null);

/** Keeps the customer's session. The access token lives in memory only; the cookie is httpOnly. */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const apply = useCallback((s: { accessToken: string; profile: Profile }) => {
    setToken(s.accessToken);
    setProfile(s.profile);
    setStatus("in");
  }, []);

  useEffect(() => {
    accountRefresh()
      .then(apply)
      .catch(() => setStatus("out"));
  }, [apply]);

  const login = useCallback<AccountValue["login"]>(
    async (email, password) => apply(await accountLogin(email, password)),
    [apply],
  );
  const signup = useCallback<AccountValue["signup"]>(
    async (b) => apply(await accountSignup(b)),
    [apply],
  );
  const logout = useCallback(async (to?: string) => {
    await accountLogout().catch(() => undefined);
    if (to) {
      window.location.assign(to);
      return;
    }
    setToken(null);
    setProfile(null);
    setStatus("out");
  }, []);

  const authed = useCallback<AccountValue["authed"]>(
    async (fn) => {
      try {
        if (!token) throw new ApiError(401, "UNAUTHORIZED", "Signed out");
        return await fn(token);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) throw err;
        const fresh = await accountRefresh(); // throws if the session really has ended
        apply(fresh);
        return fn(fresh.accessToken);
      }
    },
    [token, apply],
  );

  const value = useMemo(
    () => ({ status, profile, login, signup, logout, setProfile, authed }),
    [status, profile, login, signup, logout, authed],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount must be used inside AccountProvider");
  return v;
}

/** Only allows paths on this site, so a crafted ?next= cannot send people elsewhere. */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\"))
    return fallback;
  return next;
}
