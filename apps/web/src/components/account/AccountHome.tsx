"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "@/lib/account";
import {
  type OrderRow,
  accountDelete,
  accountOrders,
  accountPassword,
  accountResend,
  accountUpdate,
} from "@/lib/accounts-api";
import { ApiError } from "@/lib/api";
import { type FitProfile, getFitProfile } from "@/lib/storage";
import { FormMessage } from "../auth/AuthShell";
import { Button, buttonClass } from "../ui/Button";
import { Input } from "../ui/Input";
import { PasswordInput } from "../ui/PasswordInput";

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-10">
      <h2 id={id} className="text-3xl">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AccountHome() {
  const router = useRouter();
  const welcome = useSearchParams().get("welcome") === "1";
  const { status, profile, logout } = useAccount();

  useEffect(() => {
    if (status === "out") router.replace("/login?next=/account");
  }, [status, router]);

  if (status !== "in" || !profile) return <p role="status">Loading your account…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-3 text-4xl md:text-5xl">Hi, {profile.name.split(" ")[0]}</h1>
        </div>
        <Button variant="secondary" onClick={() => logout("/")}>
          Log out
        </Button>
      </div>

      {!profile.emailVerified ? <VerifyBanner welcome={welcome} email={profile.email} /> : null}

      <Section title="Your orders" id="orders">
        <Orders verified={profile.emailVerified} />
      </Section>
      <Section title="Your details" id="details">
        <Details />
      </Section>
      <FitOnDevice />
      <Section title="Password" id="password">
        <ChangePassword />
      </Section>
      <Section title="Delete your account" id="delete">
        <DeleteAccount />
      </Section>
    </div>
  );
}

function VerifyBanner({ welcome, email }: { welcome: boolean; email: string }) {
  const { authed } = useAccount();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div role="status" className="mb-2 border border-line bg-card p-5">
      <p className="font-display text-2xl">
        {welcome ? "Welcome. One more step." : "Confirm your email"}
      </p>
      <p className="mt-2 text-sm text-muted">
        We sent a link to <strong className="text-ink">{email}</strong>. Open it to see your orders
        here.
      </p>
      <button
        className="link mt-3 text-sm font-semibold"
        onClick={async () => {
          try {
            await authed((t) => accountResend(t));
            setNote("Sent. It can take a minute to arrive.");
          } catch {
            setNote("We could not send that just now. Please try again soon.");
          }
        }}
      >
        Send it again
      </button>
      {note ? <p className="mt-2 text-sm">{note}</p> : null}
    </div>
  );
}

function Orders({ verified }: { verified: boolean }) {
  const { authed } = useAccount();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!verified) return;
    authed((t) => accountOrders(t))
      .then(setOrders)
      .catch(() => setError(true));
  }, [verified, authed]);

  if (!verified) {
    return <p className="text-muted">Your orders show here once your email is confirmed.</p>;
  }
  if (error) return <p role="alert">We could not load your orders. Please try again in a bit.</p>;
  if (!orders) return <p role="status">Loading…</p>;
  if (orders.length === 0) {
    return (
      <div>
        <p className="text-muted">Nothing here yet. Orders placed with this email will show up.</p>
        <Link href="/shop" className={buttonClass("primary", "mt-5")}>
          Start shopping
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {orders.map((o) => (
        <li key={o.orderNumber} className="border border-line bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-2xl">Order #{o.orderNumber}</p>
            <p className="text-sm text-muted">{o.status.replaceAll("_", " ").toLowerCase()}</p>
          </div>
          <ul className="mt-2 text-sm text-muted">
            {o.items.map((i) => (
              <li key={`${i.title}-${i.size}`}>
                {i.quantity} × {i.title}
                {i.size ? ` (${i.size})` : ""}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            {o.trackingUrl ? (
              <a href={o.trackingUrl} className="link" rel="noopener noreferrer">
                Track with the courier
              </a>
            ) : null}
            <Link href="/exchange" className="link">
              Exchange or return
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Details() {
  const { profile, setProfile, authed } = useAccount();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [msg, setMsg] = useState<{ kind: "error" | "note"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const updated = await authed((t) =>
        accountUpdate(t, { name, phone: phone.trim() ? phone.trim() : null }),
      );
      setProfile(updated);
      setMsg({ kind: "note", text: "Saved." });
    } catch {
      setMsg({
        kind: "error",
        text: "That did not save. Check the phone number (digits only, 10 to 13).",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-5">
      <Input
        id="acc-name"
        label="Name"
        required
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        id="acc-email"
        label="Email"
        value={profile?.email ?? ""}
        readOnly
        hint="To change your email, contact us."
      />
      <Input
        id="acc-phone"
        label="Phone"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <FormMessage kind={msg?.kind ?? "note"}>{msg?.text}</FormMessage>
      <Button type="submit" className="w-fit" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

/** Height and hip remembered in this browser by the size finder, shown so people can clear it. */
function FitOnDevice() {
  const [fit, setFit] = useState<FitProfile | null>(null);
  useEffect(() => setFit(getFitProfile()), []);
  if (!fit) return null;
  return (
    <Section title="Your fit on this device" id="fit">
      <p className="text-muted">
        When you use the size finder we remember your height ({fit.heightCm} cm) and hip (
        {fit.hipCm} cm) in this browser, so reviews can be filtered to people like you. It is not on
        your account. To remove it, or any measurements you agreed to save, use the privacy page.
      </p>
      <Link href="/privacy" className="link mt-3 inline-block text-sm font-semibold">
        Go to privacy
      </Link>
    </Section>
  );
}

function ChangePassword() {
  const { authed } = useAccount();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "note"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await authed((t) => accountPassword(t, { currentPassword: current, newPassword: next }));
      setCurrent("");
      setNext("");
      setMsg({ kind: "note", text: "Password changed. Other devices have been signed out." });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setMsg({
        kind: "error",
        text:
          code === "WRONG_PASSWORD"
            ? "Your current password is not right."
            : code === "WEAK_PASSWORD"
              ? "That password is too easy to guess. Try a few words in a row."
              : "Your new password needs at least 10 characters.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-5">
      <PasswordInput
        id="pw-current"
        label="Current password"
        autoComplete="current-password"
        required
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <PasswordInput
        id="pw-new"
        label="New password"
        autoComplete="new-password"
        required
        showHint
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <FormMessage kind={msg?.kind ?? "note"}>{msg?.text}</FormMessage>
      <Button type="submit" variant="secondary" className="w-fit" disabled={busy}>
        {busy ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

function DeleteAccount() {
  const { authed, logout } = useAccount();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("Delete your account for good? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await authed((t) => accountDelete(t, password));
      await logout("/?deleted=1");
    } catch {
      setError("That password is not right.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-muted">
        This removes your account and sign-in details. Orders you have placed stay with the store
        for its records, as the law requires.
      </p>
      <details className="mt-4">
        <summary className="link cursor-pointer text-sm font-semibold">
          I want to delete my account
        </summary>
        <form onSubmit={onSubmit} className="mt-4 grid gap-5">
          <PasswordInput
            id="del-password"
            label="Confirm with your password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormMessage kind="error">{error}</FormMessage>
          <Button
            type="submit"
            variant="secondary"
            className="w-fit border-clay text-clay hover:bg-clay hover:text-bone"
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete my account"}
          </Button>
        </form>
      </details>
    </div>
  );
}
