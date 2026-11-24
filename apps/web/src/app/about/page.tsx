import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Why we are making this",
  description:
    "What is wrong with a lot of activewear in bigger sizes, and what we are doing about it.",
};

const PROMISES = [
  {
    title: "We test, and we show you",
    body: "Every legging goes through a stretch-and-squat opacity test, and the result sits on its product page. If a piece has no result, you will not see us call it squat-proof.",
  },
  {
    title: "Each size band gets its own pattern",
    body: "One pattern for UK 14 to 20 and another for UK 22 to 28, with the same inseam options throughout. Bust, waist, hip and rise all behave differently as sizes go up, so one pattern cannot just be scaled.",
  },
  {
    title: "Real people, every size",
    body: "Our models will be real customers at every size, and we will not run before-and-after weight talk. Activewear is for moving, not for fixing anyone.",
  },
  {
    title: "A swap if we get it wrong",
    body: "Every order includes one free size exchange. We would rather send a second size than lose you to a bad first one.",
  },
];

export default function About() {
  return (
    <article className="mx-auto max-w-2xl">
      <p className="eyebrow">Why we are making this</p>
      <h1 className="mt-4 text-5xl leading-[1.05] md:text-6xl">
        Activewear should fit the body that turns up
      </h1>

      <div className="mt-10 flex flex-col gap-5 text-lg leading-relaxed">
        <p>
          If you wear a bigger size, you probably know this list by heart. Leggings that slide down
          or roll at the waist. Fabric that goes see-through the moment you squat. Bras that do not
          hold. And a &ldquo;plus&rdquo; version of a piece that is somehow shorter or thinner than
          the straight-size one.
        </p>
        <p>
          A lot of brands stop at XL. Some go further, but scale a small pattern up and hope for the
          best. In India the choices are fewer still, because many labels that care about being
          sustainable or inclusive use loose fits, not stretch fabrics that support you.
        </p>
        <p>
          So we are starting with a small range: five pieces in one fabric family, in sizes UK 14 to
          28. Small, so every size gets proper attention instead of a thin spread across dozens of
          styles.
        </p>
      </div>

      <h2 className="mt-16 text-3xl md:text-4xl">What we are promising</h2>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {PROMISES.map((p) => (
          <li key={p.title} className="py-6">
            <h3 className="text-2xl">{p.title}</h3>
            <p className="mt-2 text-muted">{p.body}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-16 text-3xl md:text-4xl">Where we are right now</h2>
      <div className="mt-5 flex flex-col gap-5 text-lg leading-relaxed">
        <p>
          We are early. The pictures on this site are illustrations while we finish fitting sessions
          and a photoshoot with real customers. The size charts will change once we have measured a
          lot of real bodies in the samples, and we will say so when they do.
        </p>
        <p>
          If something here does not match what you get, tell us. That is how the next batch gets
          better.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/shop" className={buttonClass("primary")}>
          See the first five
        </Link>
        <Link href="/contact" className="link text-sm font-semibold">
          Talk to us
        </Link>
      </div>
    </article>
  );
}
