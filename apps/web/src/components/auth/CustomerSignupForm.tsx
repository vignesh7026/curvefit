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

const MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: "There is already an account with that email. Try logging in instead.",
  WEAK_PASSWORD: "That password is too easy to guess. Try a few words in a row.",
  VALIDATION_ERROR: "Please check your details. The password needs at least 10 characters.",
  RATE_LIMITED: "Too many attempts. Please wait a bit and try again.",
};

export function CustomerSignupForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { status, signup } = useAccount();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  useEffect(() => {
    if (status === "in" && !busy) router.replace(next);
  }, [status, busy, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup({
        name: f.name,
        email: f.email,
        password: f.password,
        phone: f.phone.trim() || undefined,
      });
      // The account page shows the "check your email" note for new, unverified accounts.
      router.push(next === "/account" ? "/account?welcome=1" : next);
    } catch (err) {
      setError(
        (err instanceof ApiError && MESSAGES[err.code]) ||
          "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Input
        id="su-name"
        label="Your name"
        autoComplete="name"
        required
        maxLength={80}
        value={f.name}
        onChange={set("name")}
      />
      <Input
        id="su-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={f.email}
        onChange={set("email")}
      />
      <Input
        id="su-phone"
        label="Phone number (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={f.phone}
        onChange={set("phone")}
        hint="Helpful if we need to reach you about an exchange."
      />
      <PasswordInput
        id="su-password"
        label="Password"
        autoComplete="new-password"
        required
        showHint
        value={f.password}
        onChange={set("password")}
      />
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          required
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 size-5 accent-ink"
        />
        <span>
          I have read the{" "}
          <Link href="/terms" className="link">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="link">
            privacy policy
          </Link>
          .
        </span>
      </label>
      <FormMessage kind="error">{error}</FormMessage>
      <Button type="submit" disabled={busy}>
        {busy ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted">
        Already have one?{" "}
        <Link href="/login" className="link text-ink">
          Log in
        </Link>
      </p>
    </form>
  );
}
