"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/account";
import { CartLink } from "./CartLink";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/size-guide", label: "Size guide" },
  { href: "/about", label: "Why CurveFit" },
  { href: "/track", label: "Track order" },
];

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-[1.65rem] leading-none tracking-tight ${className}`}
      aria-label="CurveFit, home"
    >
      Curve<em className="italic">fit</em>
    </Link>
  );
}

function AccountLink() {
  const { status, profile } = useAccount();
  if (status === "loading") return <span className="w-14" aria-hidden />;
  if (status === "in" && profile) {
    return (
      <Link href="/account" className="hover:underline">
        <span className="sr-only">Your account: </span>
        {profile.name.split(" ")[0]}
      </Link>
    );
  }
  return (
    <Link href="/login" className="hover:underline">
      Log in
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // Close the menu when the page changes or Escape is pressed.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin")) {
    return (
      <header className="border-b border-line bg-ink text-bone">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-3">
            <Wordmark />
            <span className="text-xs uppercase tracking-[0.16em] text-bone/70">Team</span>
          </div>
          <Link href="/" className="text-sm underline underline-offset-4">
            View the shop
          </Link>
        </div>
      </header>
    );
  }

  return (
    <>
      <div className="bg-ink px-4 py-2 text-center text-xs tracking-wide text-bone">
        One free size exchange on every order. Shipping across India.
      </div>
      <header className="sticky top-0 z-30 border-b border-line bg-bone/95 backdrop-blur">
        <nav
          className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4"
          aria-label="Main"
        >
          <div className="flex items-center gap-6 text-sm font-medium">
            <button
              className="-ml-2 flex min-h-11 items-center gap-2 px-2 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <span aria-hidden className="flex w-5 flex-col gap-1.5">
                <span
                  className={`h-px bg-ink transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`}
                />
                <span className={`h-px bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
                <span
                  className={`h-px bg-ink transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
                />
              </span>
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            </button>
            <ul className="hidden gap-6 lg:flex">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="hover:underline">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Wordmark />
          <div className="flex items-center justify-end gap-5 text-sm font-medium">
            <AccountLink />
            <CartLink />
          </div>
        </nav>
        {open ? (
          <div
            id="mobile-menu"
            ref={panel}
            className="border-t border-line bg-bone px-4 pb-6 pt-2 lg:hidden"
          >
            <ul className="flex flex-col">
              {[...NAV, { href: "/exchange", label: "Exchange or return" }].map((n) => (
                <li key={n.href} className="border-b border-line">
                  <Link href={n.href} className="block py-3.5 font-display text-2xl">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>
    </>
  );
}
