"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { safeNext, useAccount } from "@/lib/account";
import { ApiError } from "@/lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { PasswordInput } from "../ui/PasswordInput";
import { FormMessage } from "./AuthShell";

export function CustomerLoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { status, login } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: go where they were headed.
  useEffect(() => {
    if (status === "in") router.replace(next);
  }, [status, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push(next);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : "That email and password do not match. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate={false}>
      <Input
        id="login-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div>
        <PasswordInput
          id="login-password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link href="/account/forgot" className="link mt-2 inline-block text-sm">
          Forgot your password?
        </Link>
      </div>
      <FormMessage kind="error">{error}</FormMessage>
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Log in"}
      </Button>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link
          href={`/signup${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="link text-ink"
        >
          Create an account
        </Link>
        . Part of the team?{" "}
        <Link href="/admin/login" className="link text-ink">
          Team sign in
        </Link>
        .
      </p>
    </form>
  );
}
