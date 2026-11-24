"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { authForgot, authReset } from "@/lib/accounts-api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { PasswordInput } from "../ui/PasswordInput";
import { FormMessage } from "./AuthShell";

type Kind = "customer" | "staff";
const LOGIN: Record<Kind, string> = { customer: "/login", staff: "/admin/login" };

/** Step 1: ask for a reset link. The answer is the same whether or not the email has an account. */
export function ForgotForm({ type }: { type: Kind }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authForgot(type, email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too many requests. Please wait a few minutes and try again."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="border-l-2 border-sage py-1 pl-4">
        <p className="font-display text-2xl">Check your inbox</p>
        <p className="mt-2 text-muted">
          If that email has an account, a link to choose a new password is on its way. It works for
          one hour.
        </p>
        <Link href={LOGIN[type]} className="link mt-4 inline-block text-sm">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Input
        id="forgot-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <Button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send me a reset link"}
      </Button>
      <Link href={LOGIN[type]} className="link text-sm">
        Back to log in
      </Link>
    </form>
  );
}

/** Step 2: choose a new password with the emailed link. */
export function ResetForm({ type }: { type: Kind }) {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <div role="alert" className="border-l-2 border-clay py-1 pl-4">
        <p className="font-display text-2xl">This link does not look right</p>
        <p className="mt-2 text-muted">Open it straight from the email, or ask for a new one.</p>
        <Link
          href={type === "customer" ? "/account/forgot" : "/admin/forgot"}
          className="link mt-4 inline-block text-sm"
        >
          Get a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authReset(type, token, password);
      setDone(true);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "INVALID_TOKEN"
          ? "This link has expired or was already used. Please ask for a new one."
          : code === "WEAK_PASSWORD"
            ? "That password is too easy to guess. Try a few words in a row."
            : code === "VALIDATION_ERROR"
              ? "Your password needs at least 10 characters."
              : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="border-l-2 border-sage py-1 pl-4">
        <p className="font-display text-2xl">Password updated</p>
        <p className="mt-2 text-muted">
          You have been signed out everywhere. Log in with your new password.
        </p>
        <Link href={LOGIN[type]} className="link mt-4 inline-block text-sm font-semibold">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <PasswordInput
        id="reset-password"
        label="New password"
        autoComplete="new-password"
        required
        showHint
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
