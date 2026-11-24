import type { SizeBand, SizeChart } from "./types";

export type FitVerdict = "too_small" | "good" | "too_large";

/** One person trying one size in a fit session. No names: only measurements and the verdict. */
export interface FitSessionEntry {
  productId: string;
  sizeTried: string;
  heightCm: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
  fit: FitVerdict;
  /** Did the fabric stay opaque when squatting? null when not tested. */
  opacityOk?: boolean | null;
}

export interface SizeSuggestion {
  label: string;
  goodCount: number;
  band: SizeBand;
}

export interface ChartSuggestion {
  suggestions: SizeSuggestion[];
  /** Sizes with too few "good fit" entries to suggest anything. */
  insufficient: Array<{ label: string; goodCount: number }>;
  warnings: string[];
  /** Entries where the fabric went sheer: relevant to the opacity claim, not to sizing. */
  opacityFailures: number;
}

/** Fewest "good fit" entries before a size's range is suggested. */
export const MIN_GOOD_FITS = 3;

/** Nearest-rank percentile of a sorted list. */
function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] as number;
}

function rangeOf(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  // 10th to 90th percentile: one unusual body should not stretch a size's range.
  return { min: Math.floor(percentile(sorted, 10)), max: Math.ceil(percentile(sorted, 90)) };
}

/**
 * Proposes size-chart ranges from fit sessions: for each size, the spread of measurements of
 * people who said it fitted well. It is a starting draft for a person to review, never an
 * automatic change.
 */
export function suggestChart(
  entries: FitSessionEntry[],
  sizeOrder: string[],
  minGood = MIN_GOOD_FITS,
): ChartSuggestion {
  const suggestions: SizeSuggestion[] = [];
  const insufficient: ChartSuggestion["insufficient"] = [];
  const warnings: string[] = [];

  for (const label of sizeOrder) {
    const good = entries.filter((e) => e.sizeTried === label && e.fit === "good");
    if (good.length < minGood) {
      insufficient.push({ label, goodCount: good.length });
      continue;
    }
    suggestions.push({
      label,
      goodCount: good.length,
      band: {
        label,
        bust: rangeOf(good.map((e) => e.bustCm)),
        waist: rangeOf(good.map((e) => e.waistCm)),
        hip: rangeOf(good.map((e) => e.hipCm)),
      },
    });
  }

  for (let i = 1; i < suggestions.length; i++) {
    const prev = suggestions[i - 1] as SizeSuggestion;
    const cur = suggestions[i] as SizeSuggestion;
    for (const dim of ["bust", "waist", "hip"] as const) {
      if (cur.band[dim].min <= prev.band[dim].min) {
        warnings.push(
          `${cur.label} ${dim} starts no higher than ${prev.label}: check the entries.`,
        );
      } else if (cur.band[dim].min <= prev.band[dim].max) {
        warnings.push(
          `${prev.label} and ${cur.label} overlap on ${dim}: the finder will use the smaller size.`,
        );
      }
    }
  }

  return {
    suggestions,
    insufficient,
    warnings,
    opacityFailures: entries.filter((e) => e.opacityOk === false).length,
  };
}

/** Replaces bands in an existing chart with suggested ones, keeping the rest unchanged. */
export function buildDraftChart(existing: SizeChart, suggestion: ChartSuggestion): SizeChart {
  const byLabel = new Map(suggestion.suggestions.map((s) => [s.label, s.band]));
  return {
    ...existing,
    bands: existing.bands.map((b) => {
      const s = byLabel.get(b.label);
      return s ? { ...b, bust: s.bust, waist: s.waist, hip: s.hip } : b;
    }),
  };
}
