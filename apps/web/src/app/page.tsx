import Link from "next/link";
import { Suspense } from "react";
import { DeletedNote } from "@/components/DeletedNote";
import { HeroArt } from "@/components/art/HeroArt";
import { buttonClass } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import { getProducts } from "@/lib/catalogue";

const FIXES = [
  {
    complaint: "Leggings that slide down, or roll at the waist.",
    answer:
      "A high rise and a waistband built not to roll, so you are not tugging at it between sets.",
  },
  {
    complaint: "Fabric that goes see-through when you squat.",
    answer:
      "Every legging gets a stretch-and-squat opacity test, and we publish the result on its page. No result, no claim.",
  },
  {
    complaint: "Sports bras that move more than you do.",
    answer:
      "A wide band, adjustable straps and proper bounce control, in sizes that go all the way up.",
  },
  {
    complaint: "Plus sizes that are shorter or thinner than the straight-size version.",
    answer:
      "Separate patterns for UK 14 to 20 and 22 to 28, with the same inseam options in every size.",
  },
];

const STEPS = [
  "Give us your order number and the phone number on it.",
  "Type in the code we send you.",
  "Pick the new size. We collect the old one and send the new one.",
];

export default async function Home() {
  const products = (await getProducts()).slice(0, 4);
  return (
    <div className="flex flex-col gap-24 md:gap-32">
      <Suspense>
        <DeletedNote />
      </Suspense>
      {/* Hero */}
      <section className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="eyebrow">Activewear for curvier bodies</p>
          <h1 className="mt-5 text-[2.9rem] leading-[1.02] sm:text-6xl md:text-7xl">
            Leggings that stay up.
            <br />
            <em className="text-clay">Bras that hold.</em>
          </h1>
          <p className="mt-7 max-w-md text-lg text-muted">
            Sizes UK 14 to 28 (XL to 6XL), designed around curvy bodies from the first sketch. And
            if we still get your size wrong, your first exchange is free.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/shop" className={buttonClass("primary")}>
              Shop the first five
            </Link>
            <Link href="/size-guide" className="link text-sm font-semibold">
              How we size
            </Link>
          </div>
        </div>
        <HeroArt />
      </section>

      {/* What we are fixing */}
      <section aria-labelledby="fixes">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Why this exists</p>
            <h2 id="fixes" className="mt-4 text-4xl md:text-5xl">
              Four things we got tired of
            </h2>
            <p className="mt-5 max-w-sm text-muted">
              These come up again and again when people write about activewear in bigger sizes. So
              they are where we started.
            </p>
            <Link href="/about" className="link mt-6 inline-block text-sm font-semibold">
              Read the longer version
            </Link>
          </div>
          <ol className="divide-y divide-line border-y border-line">
            {FIXES.map((f, i) => (
              <li key={f.complaint} className="grid gap-4 py-7 sm:grid-cols-[4.5rem_1fr]">
                <span className="font-display text-4xl italic text-clay" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-2xl">{f.complaint}</h3>
                  <p className="mt-2 text-muted">{f.answer}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Products */}
      <section aria-labelledby="first-five">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The first five</p>
            <h2 id="first-five" className="mt-3 text-4xl md:text-5xl">
              Small range, on purpose
            </h2>
          </div>
          <Link href="/shop" className="link hidden text-sm font-semibold sm:block">
            See everything
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.handle} product={p} />
          ))}
        </div>
        <Link href="/shop" className="link mt-8 inline-block text-sm font-semibold sm:hidden">
          See everything
        </Link>
      </section>

      {/* Size finder */}
      <section
        aria-labelledby="finder"
        className="grid gap-10 bg-plum p-8 text-bone md:grid-cols-2 md:p-14"
      >
        <div className="self-center">
          <p className="eyebrow !text-sand">Sizing, honestly</p>
          <h2 id="finder" className="mt-4 text-4xl md:text-5xl">
            Between two sizes? We will show you both.
          </h2>
          <p className="mt-5 max-w-md text-bone/80">
            Put in your height, bust, waist and hip. If you land close to the edge of a size, we say
            so and tell you which way the fabric gives. Nothing is saved unless you tick the box.
          </p>
          <Link
            href="/products/high-rise-squat-proof-legging"
            className={buttonClass("light", "mt-8")}
          >
            Try it on a legging
          </Link>
        </div>
        <figure className="self-center bg-bone p-6 text-ink md:p-8">
          <figcaption className="eyebrow">Example answer</figcaption>
          <p className="mt-4 font-display text-3xl">We recommend 2XL</p>
          <p className="mt-1">You could also consider XL.</p>
          <p className="mt-4 text-sm text-muted">
            You are between XL and 2XL. The fabric has 4-way stretch: choose the smaller size for a
            compression fit, the larger for a relaxed fit.
          </p>
        </figure>
      </section>

      {/* Exchanges */}
      <section aria-labelledby="exchange" className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">If it is not right</p>
          <h2 id="exchange" className="mt-4 text-4xl md:text-5xl">
            A free swap, no forms to print
          </h2>
        </div>
        <div>
          <ol className="flex flex-col gap-5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-5">
                <span className="font-display text-2xl italic text-clay" aria-hidden>
                  {i + 1}
                </span>
                <p className="pt-1">{s}</p>
              </li>
            ))}
          </ol>
          <Link href="/exchange" className={buttonClass("secondary", "mt-8")}>
            Start an exchange
          </Link>
        </div>
      </section>

      {/* List */}
      <section aria-labelledby="join" className="border-y border-line py-14 text-center">
        <h2 id="join" className="text-3xl md:text-4xl">
          Be first when the sizes land
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Launch news and first pick of every size. Friends who join with your link move you up.
        </p>
        <Link href="/waitlist" className={buttonClass("primary", "mt-7")}>
          Join the list
        </Link>
      </section>
    </div>
  );
}
