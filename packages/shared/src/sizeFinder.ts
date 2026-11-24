import type { Measurements, Range, SizeBand, SizeChart, SizeRecommendation } from "./types";

/** A measurement within this many cm of a band edge triggers the two-size answer. */
export const EDGE_TOLERANCE_CM = 1;

type Position = "below" | "in" | "above";

interface BandHit {
  index: number;
  position: Position;
}

type Dimension = "bust" | "waist" | "hip";

/**
 * Finds the band a value belongs to. A value that falls in the small gap between two bands is
 * assigned to the larger band, so a borderline customer is never squeezed.
 */
function findBand(bands: SizeBand[], dim: Dimension, value: number): BandHit {
  const last = bands.length - 1;
  const first = bands[0]?.[dim];
  const lastRange = bands[last]?.[dim];
  if (!first || !lastRange) throw new Error("Size chart has no bands");
  if (value < first.min) return { index: 0, position: "below" };
  if (value > lastRange.max) return { index: last, position: "above" };
  const index = bands.findIndex((b) => value <= b[dim].max);
  return { index, position: "in" };
}

function rangeOf(band: SizeBand | undefined, dim: Dimension): Range {
  if (!band) throw new Error("Band index out of range");
  return band[dim];
}

/**
 * Size finder v1 (rules only):
 * 1. Find the band each measurement falls in.
 * 2. Recommend the largest band reached by hip or waist; if bust is in a larger band, flag
 *    bras and tops as one size up.
 * 3. If the deciding measurement is within 1 cm of a band edge, show both sizes.
 */
export function recommendSize(chart: SizeChart, m: Measurements): SizeRecommendation {
  const { bands } = chart;
  if (bands.length === 0) throw new Error("Size chart has no bands");
  const last = bands.length - 1;

  const hip = findBand(bands, "hip", m.hipCm);
  const waist = findBand(bands, "waist", m.waistCm);
  const bust = findBand(bands, "bust", m.bustCm);

  const notes: string[] = [];

  if (hip.position !== "in" || waist.position !== "in") {
    const above = hip.position === "above" || waist.position === "above";
    notes.push(
      above
        ? "Your hip or waist is above our current size range. Contact us and we will help."
        : "Your hip or waist is below our current size range (we start at UK 14 / XL).",
    );
    return {
      status: "out_of_range",
      size: null,
      alternateSize: null,
      alternateDirection: null,
      bustOneSizeUp: false,
      notes,
    };
  }

  const base = Math.max(hip.index, waist.index);
  const bustOneSizeUp = bust.index > base;
  const shift = bustOneSizeUp && chart.category !== "bottom" ? 1 : 0;

  // Measurements that decided the base band.
  const deciding: Array<{ dim: Dimension; value: number }> = [];
  if (hip.index === base) deciding.push({ dim: "hip", value: m.hipCm });
  if (waist.index === base) deciding.push({ dim: "waist", value: m.waistCm });

  const baseBand = bands[base] as SizeBand;
  let alternateIndex: number | null = null;
  let alternateDirection: "up" | "down" | null = null;

  const nearUpper = deciding.some(
    (d) => rangeOf(baseBand, d.dim).max - d.value <= EDGE_TOLERANCE_CM,
  );
  const nearLower = deciding.every(
    (d) => d.value - rangeOf(baseBand, d.dim).min <= EDGE_TOLERANCE_CM,
  );

  if (nearUpper && base < last) {
    alternateIndex = base + 1;
    alternateDirection = "up";
  } else if (nearLower && base > 0) {
    alternateIndex = base - 1;
    alternateDirection = "down";
  }

  const clamp = (i: number) => Math.min(i + shift, last);
  const size = (bands[clamp(base)] as SizeBand).label;
  let alternateSize: string | null = null;
  if (alternateIndex !== null) {
    const alt = (bands[clamp(alternateIndex)] as SizeBand).label;
    if (alt !== size) {
      alternateSize = alt;
      notes.push(`You are between ${size} and ${alt}. ${chart.stretchNote}`);
    } else {
      alternateDirection = null;
    }
  }

  if (bustOneSizeUp) {
    notes.push(
      chart.category === "bottom"
        ? "Your bust is larger than your hip and waist: choose your bra and top one size up."
        : "Your bust is larger than your hip and waist, so we sized this up by one.",
    );
  }

  return {
    status: "ok",
    size,
    alternateSize,
    alternateDirection: alternateSize ? alternateDirection : null,
    bustOneSizeUp,
    notes,
  };
}
