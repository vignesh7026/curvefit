"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/account";
import { accountVerify } from "@/lib/accounts-api";

export function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const { status, profile, setProfile } = useAccount();
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  // The link works once, and React runs effects twice in development: only ever call it once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setState("failed");
      return;
    }
    accountVerify(token)
      .then(() => setState("done"))
      .catch(() => setState("failed"));
  }, [token]);

  // If this browser is signed in, update what the account page shows.
  useEffect(() => {
    if (state === "done" && status === "in" && profile && !profile.emailVerified) {
      setProfile({ ...profile, emailVerified: true });
    }
  }, [state, status, profile, setProfile]);

  if (state === "working") return <p role="status">Checking your link…</p>;
  if (state === "failed") {
    return (
      <div role="alert" className="border-l-2 border-clay py-1 pl-4">
        <h1 className="font-display text-3xl">This link has expired</h1>
        <p className="mt-2 text-muted">
          It may have been used already. Log in and we can send you a fresh one.
        </p>
        <Link href="/account" className="link mt-4 inline-block text-sm font-semibold">
          Go to your account
        </Link>
      </div>
    );
  }
  return (
    <div role="status" className="border-l-2 border-sage py-1 pl-4">
      <h1 className="font-display text-3xl">Email confirmed</h1>
      <p className="mt-2 text-muted">Thanks. Your orders will now show up in your account.</p>
      <Link href="/account" className="link mt-4 inline-block text-sm font-semibold">
        Go to your account
      </Link>
    </div>
  );
}
