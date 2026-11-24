/** Inclusive range in centimetres. */
export interface Range {
  min: number;
  max: number;
}

export type ProductCategory = "bottom" | "bra" | "top";

export interface SizeBand {
  /** Alpha size label, e.g. "3XL". */
  label: string;
  /** UK size equivalent(s), e.g. "20-22". Informational. */
  uk?: string;
  bust: Range;
  waist: Range;
  hip: Range;
  rise?: Range;
  inseam?: Range;
}

/** Per-product size chart; bands are ordered smallest to largest. */
export interface SizeChart {
  productId: string;
  category: ProductCategory;
  /** Plain-language note about which way the fabric gives, shown when two sizes are shown. */
  stretchNote: string;
  bands: SizeBand[];
}

export interface Measurements {
  heightCm: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
}

export type RecommendationStatus = "ok" | "out_of_range";

export interface SizeRecommendation {
  status: RecommendationStatus;
  /** Recommended size label, or null when status is out_of_range. */
  size: string | null;
  /** Second size to consider when a measurement sits within 1 cm of a band edge. */
  alternateSize: string | null;
  alternateDirection: "up" | "down" | null;
  /** True when bust sits in a larger band than hip/waist. */
  bustOneSizeUp: boolean;
  notes: string[];
}
