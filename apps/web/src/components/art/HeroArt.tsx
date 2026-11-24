import { Garment } from "./Garment";

/**
 * The home page picture: an arched window with two pieces overlapping inside it. An illustration
 * for now; when there is photography, replace this component with an <Image>.
 */
export function HeroArt() {
  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-plum"
      style={{ borderRadius: "999px 999px 0 0" }}
      role="img"
      aria-label="A clay-coloured legging and a sand-coloured sports bra, illustration"
    >
      <div aria-hidden className="absolute -right-8 top-[14%] size-44 rounded-full bg-sand/90" />
      <div aria-hidden className="absolute -left-10 bottom-[8%] size-28 rounded-full bg-clay/80" />
      <div className="absolute inset-x-[6%] bottom-[-4%] top-[14%] -rotate-[5deg]">
        <Garment
          kind="legging"
          colour="clay"
          bare
          label=""
          className="h-full w-full drop-shadow-2xl"
        />
      </div>
      <div className="absolute right-[4%] top-[30%] w-[52%] rotate-[7deg]">
        <Garment
          kind="bra"
          colour="sand"
          bare
          label=""
          className="aspect-[4/5] w-full drop-shadow-xl"
        />
      </div>
    </div>
  );
}
