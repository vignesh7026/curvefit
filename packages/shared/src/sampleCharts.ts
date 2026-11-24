import type { SizeBand, SizeChart } from "./types";

/**
 * PLACEHOLDER measurements (cm) so the size finder can be built and tested.
 * Replace with the real chart after the fit sessions in roadmap phase 2.
 */
const bands: SizeBand[] = [
  ["XL", "14-16", 100, 88, 108],
  ["2XL", "18", 108, 96, 116],
  ["3XL", "20-22", 116, 104, 124],
  ["4XL", "24", 124, 112, 132],
  ["5XL", "26", 132, 120, 140],
  ["6XL", "28", 140, 128, 148],
].map(([label, uk, bust, waist, hip]) => ({
  label: label as string,
  uk: uk as string,
  bust: { min: bust as number, max: (bust as number) + 7 },
  waist: { min: waist as number, max: (waist as number) + 7 },
  hip: { min: hip as number, max: (hip as number) + 7 },
}));

const STRETCH =
  "The fabric has 4-way stretch: choose the smaller size for a compression fit, the larger for a relaxed fit.";

export const sampleLegging: SizeChart = {
  productId: "high-rise-squat-proof-legging",
  category: "bottom",
  stretchNote: STRETCH,
  bands,
};

export const sampleBra: SizeChart = {
  productId: "high-impact-sports-bra",
  category: "bra",
  stretchNote: STRETCH,
  bands,
};

export const sampleCharts: SizeChart[] = [sampleLegging, sampleBra];
