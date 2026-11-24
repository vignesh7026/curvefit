"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  type StaffSession,
  staffAcceptInvite,
  staffLogin,
  staffLogout,
  staffRefresh,
} from "./accounts-api";

type Status = "loading" | "out" | "in";

interface StaffValue {
  status: Status;
  token: string | null;
  role: "admin" | "support" | null;
  name: string;
  login: (email: string, password: string) => Promise<void>;
  acceptInvite: (b: { token: string; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<StaffValue | null>(null);

/** Refresh a little before the 15-minute access token runs out. */
const REFRESH_EVERY_MS = 10 * 60_000;

export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<StaffSession | null>(null);

  const apply = useCallback((s: StaffSession) => {
    setSession(s);
    setStatus("in");
  }, []);

  // The refresh cookie is httpOnly, so ask the API for a fresh access token on load.
  useEffect(() => {
    staffRefresh()
      .then(apply)
      .catch(() => setStatus("out"));
  }, [apply]);

  // Keep the token fresh while the page stays open, so long sessions do not start failing.
  useEffect(() => {
    if (status !== "in") return;
    const id = window.setInterval(() => {
      staffRefresh()
        .then(apply)
        .catch(() => setStatus("out"));
    }, REFRESH_EVERY_MS);
    return () => window.clearInterval(id);
  }, [status, apply]);

  const login = useCallback<StaffValue["login"]>(
    async (email, password) => apply(await staffLogin(email, password)),
    [apply],
  );
  const acceptInvite = useCallback<StaffValue["acceptInvite"]>(
    async (b) => apply(await staffAcceptInvite(b)),
    [apply],
  );
  const logout = useCallback(async () => {
    await staffLogout().catch(() => undefined);
    setSession(null);
    setStatus("out");
  }, []);

  const value = useMemo<StaffValue>(
    () => ({
      status,
      token: session?.accessToken ?? null,
      role: session?.role ?? null,
      name: session?.name ?? "",
      login,
      acceptInvite,
      logout,
    }),
    [status, session, login, acceptInvite, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStaff(): StaffValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStaff must be used inside StaffSessionProvider");
  return v;
}
