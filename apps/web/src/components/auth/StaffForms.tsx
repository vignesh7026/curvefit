"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { staffInviteInfo } from "@/lib/accounts-api";
import { useStaff } from "@/lib/staff-session";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { PasswordInput } from "../ui/PasswordInput";
import { FormMessage } from "./AuthShell";

export function StaffLoginForm() {
  const router = useRouter();
  const { status, login } = useStaff();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: straight to the dashboard.
  useEffect(() => {
    if (status === "in") router.replace("/admin");
  }, [status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Invalid email or password.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Input
        id="staff-email"
        label="Work email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div>
        <PasswordInput
          id="staff-password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link href="/admin/forgot" className="link mt-2 inline-block text-sm">
          Forgot your password?
        </Link>
      </div>
      <FormMessage kind="error">{error}</FormMessage>
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-sm text-muted">
        New to the team? Staff accounts are created by invitation: ask an admin to send you one,
        then{" "}
        <Link href="/admin/signup" className="link text-ink">
          set up your account
        </Link>
        .
      </p>
    </form>
  );
}

/** Staff sign-up: only works with the invitation link an admin sent. */
export function StaffSignupForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { acceptInvite } = useStaff();
  const [invite, setInvite] = useState<
    | { state: "checking" }
    | { state: "none" }
    | { state: "bad" }
    | { state: "ok"; email: string; role: string }
  >({ state: "checking" });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvite({ state: "none" });
      return;
    }
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setInvite({ state: "bad" });
      return;
    }
    staffInviteInfo(token)
      .then((i) => setInvite({ state: "ok", ...i }))
      .catch(() => setInvite({ state: "bad" }));
  }, [token]);

  if (invite.state === "checking") return <p role="status">Checking your invitation…</p>;

  if (invite.state === "none") {
    return (
      <div className="border-l-2 border-line py-1 pl-4">
        <p className="font-display text-2xl">You need an invitation</p>
        <p className="mt-2 text-muted">
          Staff accounts are not open to the public. Ask an admin to invite you, and use the link in
          the email they send.
        </p>
        <Link href="/admin/login" className="link mt-4 inline-block text-sm font-semibold">
          I already have an account
        </Link>
      </div>
    );
  }

  if (invite.state === "bad") {
    return (
      <div role="alert" className="border-l-2 border-clay py-1 pl-4">
        <p className="font-display text-2xl">This invitation is not valid</p>
        <p className="mt-2 text-muted">
          It may have expired, been used already, or been cancelled. Ask an admin to send a new one.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await acceptInvite({ token, name, password });
      router.push("/admin");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "WEAK_PASSWORD"
          ? "That password is too easy to guess, or contains your email. Try a few words in a row."
          : code === "VALIDATION_ERROR"
            ? "Please enter your name and a password of at least 10 characters."
            : code === "INVALID_TOKEN" || code === "ALREADY_STAFF"
              ? "This invitation can no longer be used."
              : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className="border-l-2 border-sage py-1 pl-4 text-sm">
        You have been invited as <strong>{invite.role}</strong> with <strong>{invite.email}</strong>
        .
      </p>
      <Input
        id="staff-name"
        label="Your name"
        autoComplete="name"
        required
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <PasswordInput
        id="staff-new-password"
        label="Choose a password"
        autoComplete="new-password"
        required
        showHint
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <Button type="submit" disabled={busy}>
        {busy ? "Creating your account…" : "Create my account"}
      </Button>
    </form>
  );
}
