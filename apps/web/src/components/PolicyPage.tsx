import type { ReactNode } from "react";

export interface PolicySection {
  heading: string;
  body: ReactNode;
}

/**
 * Shared layout for policy pages. Every policy is a DRAFT until the business has settled the
 * open decisions and a lawyer has reviewed it; the banner says so and lists what is still open.
 */
export function PolicyPage({
  title,
  intro,
  sections,
  decisions,
}: {
  title: string;
  intro: string;
  sections: PolicySection[];
  decisions: string[];
}) {
  return (
    <article className="max-w-2xl">
      <h1 className="mb-3 text-3xl">{title}</h1>
      <div className="mb-6 rounded-sm border border-line bg-card p-4 text-sm">
        <p className="font-semibold">Draft: not final</p>
        <p className="mt-1 text-muted">
          This page is a working draft and has not been reviewed by a lawyer. Still to be decided:
        </p>
        <ul className="mt-2 list-disc pl-5 text-muted">
          {decisions.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
      <p className="text-muted">{intro}</p>
      {sections.map((s) => (
        <section key={s.heading} className="mt-6">
          <h2 className="text-xl font-semibold">{s.heading}</h2>
          <div className="mt-2 flex flex-col gap-2 text-muted">{s.body}</div>
        </section>
      ))}
    </article>
  );
}
