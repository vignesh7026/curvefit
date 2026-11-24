"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PaymentMethods } from "./PaymentMethods";
import { Wordmark } from "./SiteHeader";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All pieces" },
      { href: "/size-guide", label: "Size guide" },
      { href: "/waitlist", label: "Join the list" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/track", label: "Track an order" },
      { href: "/exchange", label: "Exchange or return" },
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "CurveFit",
    links: [
      { href: "/about", label: "Why we are making this" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/admin/login", label: "Team sign in" },
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <footer className="mt-24 border-t border-line bg-sand/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Activewear designed around curvy bodies, in sizes UK 14 to 28. Starting in India.
          </p>
          <PaymentMethods className="mt-6" />
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="eyebrow !text-ink">{c.title}</h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} CurveFit
      </div>
    </footer>
  );
}
