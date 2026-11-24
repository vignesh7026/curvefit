import { useId } from "react";

export type GarmentKind = "legging" | "short" | "bra" | "longline" | "tee";
export type Colourway = "plum" | "clay" | "ink" | "sage" | "sand";
export type GarmentView = "front" | "detail";

interface Palette {
  base: string;
  light: string;
  dark: string;
  /** Soft background behind the garment. */
  backdrop: string;
  /** Stitching and trim. */
  trim: string;
}

export const COLOURWAYS: Record<Colourway, Palette> = {
  plum: {
    base: "#4a2233",
    light: "#6b3a50",
    dark: "#2c1220",
    backdrop: "#e8dccf",
    trim: "#f1e3d8",
  },
  clay: {
    base: "#a8452a",
    light: "#c9694a",
    dark: "#7a2f1a",
    backdrop: "#ecdfd2",
    trim: "#f6e4d6",
  },
  ink: { base: "#2a2420", light: "#4b423b", dark: "#15110e", backdrop: "#e4dbcf", trim: "#d8cdbf" },
  sage: {
    base: "#5d6b52",
    light: "#7f8e72",
    dark: "#3f4a37",
    backdrop: "#e6dfd0",
    trim: "#eee6d4",
  },
  sand: {
    base: "#d6c2a4",
    light: "#e8d8bf",
    dark: "#b39b78",
    backdrop: "#ddd0bd",
    trim: "#8f7a5a",
  },
};

export const KIND_LABEL: Record<GarmentKind, string> = {
  legging: "High-rise legging",
  short: "Bike short",
  bra: "High-impact sports bra",
  longline: "Longline bra",
  tee: "Oversized training tee",
};

/** Silhouettes drawn in a 400-wide space, centred on x = 200. */
const SHAPES: Record<
  GarmentKind,
  {
    body: string;
    transform: string;
    extras: (p: Palette, decorative: boolean) => React.ReactNode;
    detailBox: string;
  }
> = {
  legging: {
    body: "M88 52 H312 C342 140 330 300 290 540 H232 C222 420 210 300 200 215 C190 300 178 420 168 540 H110 C70 300 58 140 88 52 Z",
    transform: "translate(22 -4) scale(0.89)",
    detailBox: "70 40 260 230",
    extras: (p, deco) => (
      <>
        {/* waistband */}
        <path d="M92 52 H308 L306 104 C260 114 140 114 94 104 Z" fill={p.dark} opacity="0.55" />
        <path
          d="M94 104 C140 114 260 114 306 104"
          stroke={p.trim}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="5 4"
        />
        {/* side pocket */}
        <path
          d="M112 128 C128 124 146 130 150 156 L152 212"
          stroke={p.trim}
          strokeOpacity="0.55"
          strokeWidth="1.6"
          fill="none"
          strokeDasharray="5 4"
        />
        {/* inseam and centre seam */}
        <path
          d="M200 215 C190 300 178 420 168 560"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M200 215 C210 300 222 420 232 560"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M200 104 L200 215"
          stroke={p.dark}
          strokeOpacity="0.45"
          strokeWidth="2"
          fill="none"
        />
        {/* woven label */}
        <rect x="228" y="68" width="34" height="18" rx="2" fill={p.trim} opacity="0.85" />
        {deco ? null : (
          <text
            x="245"
            y="81"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill={p.dark}
            fontFamily="serif"
          >
            CF
          </text>
        )}
      </>
    ),
  },
  short: {
    body: "M92 52 H308 C326 110 322 220 316 330 H232 C226 270 212 235 200 215 C188 235 174 270 168 330 H84 C78 220 74 110 92 52 Z",
    transform: "translate(-40 6) scale(1.2)",
    detailBox: "70 40 260 200",
    extras: (p, deco) => (
      <>
        <path d="M92 52 H308 L306 100 C260 110 140 110 94 100 Z" fill={p.dark} opacity="0.55" />
        <path
          d="M94 100 C140 110 260 110 306 100"
          stroke={p.trim}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="5 4"
        />
        <path
          d="M200 100 L200 215"
          stroke={p.dark}
          strokeOpacity="0.45"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M200 215 C212 235 226 270 232 330"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M200 215 C188 235 174 270 168 330"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M86 318 H166 M234 318 H314"
          stroke={p.trim}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <rect x="228" y="64" width="34" height="18" rx="2" fill={p.trim} opacity="0.85" />
        {deco ? null : (
          <text
            x="245"
            y="77"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill={p.dark}
            fontFamily="serif"
          >
            CF
          </text>
        )}
      </>
    ),
  },
  bra: {
    body: "M130 40 H158 C160 100 164 140 174 168 C186 196 214 196 226 168 C236 140 240 100 242 40 H270 C272 100 280 150 316 215 V300 C316 320 300 332 280 332 H120 C100 332 84 320 84 300 V215 C120 150 128 100 130 40 Z",
    transform: "translate(-60 8) scale(1.3)",
    detailBox: "100 50 200 210",
    extras: (p) => (
      <>
        <path
          d="M84 250 C140 262 260 262 316 250 V300 C316 320 300 332 280 332 H120 C100 332 84 320 84 300 Z"
          fill={p.dark}
          opacity="0.5"
        />
        <path
          d="M84 250 C140 262 260 262 316 250"
          stroke={p.trim}
          strokeOpacity="0.55"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="5 4"
        />
        <path
          d="M174 168 C166 205 160 235 158 258"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M226 168 C234 205 240 235 242 258"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path d="M200 192 V260" stroke={p.dark} strokeOpacity="0.4" strokeWidth="2" fill="none" />
        <rect x="131" y="72" width="26" height="9" rx="2" fill={p.trim} opacity="0.85" />
        <rect x="243" y="72" width="26" height="9" rx="2" fill={p.trim} opacity="0.85" />
        <path
          d="M136 46 V70 M151 46 V70 M248 46 V70 M263 46 V70"
          stroke={p.dark}
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
      </>
    ),
  },
  longline: {
    body: "M130 40 H158 C160 100 164 140 174 168 C186 196 214 196 226 168 C236 140 240 100 242 40 H270 C272 100 280 150 316 215 V385 C316 396 306 402 292 402 H108 C94 402 84 396 84 385 V215 C120 150 128 100 130 40 Z",
    transform: "translate(-10 14) scale(1.05)",
    detailBox: "90 40 220 220",
    extras: (p) => (
      <>
        <path
          d="M84 250 C140 262 260 262 316 250 V385 C316 396 306 402 292 402 H108 C94 402 84 396 84 385 Z"
          fill={p.dark}
          opacity="0.42"
        />
        <path
          d="M84 250 C140 262 260 262 316 250"
          stroke={p.trim}
          strokeOpacity="0.55"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="5 4"
        />
        <path
          d="M174 168 C166 205 160 235 158 258"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M226 168 C234 205 240 235 242 258"
          stroke={p.dark}
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
        />
        <path d="M200 192 V260" stroke={p.dark} strokeOpacity="0.4" strokeWidth="2" fill="none" />
        <path
          d="M86 300 H314 M86 345 H314"
          stroke={p.trim}
          strokeOpacity="0.28"
          strokeWidth="1.2"
          strokeDasharray="3 5"
        />
        <rect x="131" y="72" width="26" height="9" rx="2" fill={p.trim} opacity="0.85" />
        <rect x="243" y="72" width="26" height="9" rx="2" fill={p.trim} opacity="0.85" />
      </>
    ),
  },
  tee: {
    body: "M170 60 L70 110 L105 190 L150 168 V430 H350 V168 L395 190 L430 110 L330 60 C312 92 188 92 170 60 Z",
    transform: "translate(-52 4) scale(1.08)",
    detailBox: "90 30 320 230",
    extras: (p, deco) => (
      <>
        <path
          d="M170 60 C188 92 312 92 330 60"
          stroke={p.dark}
          strokeOpacity="0.7"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M150 168 L105 190 M350 168 L395 190"
          stroke={p.trim}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <path
          d="M150 168 C162 120 170 90 170 60 M350 168 C338 120 330 90 330 60"
          stroke={p.dark}
          strokeOpacity="0.3"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M152 418 H348"
          stroke={p.trim}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        {deco ? null : (
          <text
            x="250"
            y="150"
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill={p.trim}
            opacity="0.75"
            fontFamily="serif"
            letterSpacing="2"
          >
            CURVEFIT
          </text>
        )}
      </>
    ),
  },
};

interface GarmentProps {
  kind: GarmentKind;
  colour?: Colourway;
  view?: GarmentView;
  /** Draw the garment alone, with no backdrop, so it can sit on another surface. */
  bare?: boolean;
  /** Accessible description; pass an empty string if the image is decorative. */
  label?: string;
  className?: string;
}

/**
 * A flat-lay illustration of one of the five pieces. This is a stand-in until real photography
 * exists: swap it by giving the product an image in Shopify, which always takes precedence.
 */
export function Garment({
  kind,
  colour = "plum",
  view = "front",
  bare = false,
  label,
  className,
}: GarmentProps) {
  const uid = useId().replace(/:/g, "");
  const p = COLOURWAYS[colour];
  const shape = SHAPES[kind];
  const decorative = label === "";
  const viewBox = view === "detail" ? shape.detailBox : "0 0 400 500";

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-label={
        decorative ? undefined : (label ?? `${KIND_LABEL[kind]} in ${colour}, illustration`)
      }
      aria-hidden={decorative ? true : undefined}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.dark} />
          <stop offset="0.28" stopColor={p.base} />
          <stop offset="0.5" stopColor={p.light} />
          <stop offset="0.74" stopColor={p.base} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-fall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
        <pattern
          id={`${uid}-knit`}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <rect width="5" height="5" fill="none" />
          <path d="M0 2.5 H5" stroke="#000" strokeOpacity="0.07" strokeWidth="1" />
        </pattern>
        <radialGradient id={`${uid}-light`} cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <path d={shape.body} />
        </clipPath>
      </defs>

      {bare ? null : (
        <>
          <rect width="400" height="500" fill={p.backdrop} />
          <rect width="400" height="500" fill={`url(#${uid}-light)`} />
        </>
      )}

      <g transform={shape.transform}>
        {/* soft contact shadow */}
        <path d={shape.body} fill="#000" opacity="0.14" transform="translate(6 14)" />
        <path d={shape.body} fill={`url(#${uid}-fill)`} />
        <g clipPath={`url(#${uid}-clip)`}>
          <rect x="0" y="0" width="460" height="640" fill={`url(#${uid}-knit)`} />
          <rect x="0" y="0" width="460" height="640" fill={`url(#${uid}-fall)`} />
        </g>
        {shape.extras(p, decorative)}
        <path d={shape.body} fill="none" stroke={p.dark} strokeOpacity="0.55" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/** Four colourways of one piece, side by side, for the last picture in a gallery. */
export function ColourwayRow({ kind, label }: { kind: GarmentKind; label?: string }) {
  const ways: Colourway[] = ["plum", "clay", "ink", "sage"];
  return (
    <div
      className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-line"
      role={label === "" ? undefined : "img"}
      aria-hidden={label === "" ? true : undefined}
      aria-label={
        label === "" ? undefined : (label ?? `${KIND_LABEL[kind]} in four colours, illustration`)
      }
    >
      {ways.map((c) => (
        <Garment key={c} kind={kind} colour={c} label="" className="h-full w-full" />
      ))}
    </div>
  );
}
