import type { ReactNode } from "react";
import { Garment, type Colourway, type GarmentKind } from "../art/Garment";

/**
 * Two-column layout for sign in, sign up and recovery: the form on the left, a quiet coloured
 * panel on the right (hidden on phones so the form comes first).
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  footer,
  art = { kind: "legging", colour: "plum" },
  tone = "plum",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
  art?: { kind: GarmentKind; colour: Colourway };
  tone?: "plum" | "ink";
}) {
  return (
    <div className="mx-auto grid max-w-5xl items-stretch gap-0 md:grid-cols-[1fr_0.8fr]">
      <div className="flex flex-col justify-center py-4 md:py-10 md:pr-16">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-4xl md:text-5xl">{title}</h1>
        {intro ? <p className="mt-4 max-w-md text-muted">{intro}</p> : null}
        <div className="mt-8 max-w-md">{children}</div>
        {footer ? <div className="mt-8 max-w-md text-sm text-muted">{footer}</div> : null}
      </div>
      <div
        aria-hidden
        className={`relative hidden min-h-[30rem] overflow-hidden md:block ${tone === "ink" ? "bg-ink" : "bg-plum"}`}
      >
        <div className="absolute -right-10 top-10 size-48 rounded-full bg-sand/85" />
        <div className="absolute -left-12 bottom-16 size-32 rounded-full bg-clay/80" />
        <div className="absolute inset-x-[8%] bottom-[-6%] top-[10%] rotate-[4deg]">
          <Garment
            kind={art.kind}
            colour={art.colour}
            bare
            label=""
            className="h-full w-full drop-shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}

/** Inline message under a form: errors are announced, notes are not. */
export function FormMessage({ kind, children }: { kind: "error" | "note"; children: ReactNode }) {
  if (!children) return <div role={kind === "error" ? "alert" : "status"} className="min-h-5" />;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`border-l-2 py-1 pl-3 text-sm ${kind === "error" ? "border-clay text-clay-dark" : "border-sage text-ink"}`}
    >
      {children}
    </div>
  );
}
