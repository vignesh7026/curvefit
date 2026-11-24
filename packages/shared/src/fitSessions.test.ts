import { describe, expect, it } from "vitest";
import { type FitSessionEntry, buildDraftChart, sampleLegging, suggestChart } from "./index";

const entry = (sizeTried: string, hip: number, fit: FitSessionEntry["fit"] = "good") => ({
  productId: "p",
  sizeTried,
  heightCm: 165,
  bustCm: hip - 8,
  waistCm: hip - 20,
  hipCm: hip,
  fit,
});

const order = ["XL", "2XL", "3XL"];

describe("suggestChart", () => {
  it("builds a range from people who said the size fitted well", () => {
    const entries = [110, 111, 112, 113, 114].map((h) => entry("XL", h));
    const s = suggestChart(entries, order);
    expect(s.suggestions).toHaveLength(1);
    expect(s.suggestions[0]?.label).toBe("XL");
    expect(s.suggestions[0]?.goodCount).toBe(5);
    expect(s.suggestions[0]?.band.hip).toEqual({ min: 110, max: 114 });
    expect(s.suggestions[0]?.band.waist).toEqual({ min: 90, max: 94 });
  });

  it("ignores too-small and too-large verdicts", () => {
    const entries = [
      ...[110, 111, 112].map((h) => entry("XL", h)),
      entry("XL", 130, "too_small"),
      entry("XL", 90, "too_large"),
    ];
    const band = suggestChart(entries, order).suggestions[0]?.band;
    expect(band?.hip).toEqual({ min: 110, max: 112 });
  });

  it("does not let one unusual body stretch the range", () => {
    const hips = [110, 111, 111, 112, 112, 112, 113, 113, 114, 140];
    const band = suggestChart(
      hips.map((h) => entry("XL", h)),
      order,
    ).suggestions[0]?.band;
    expect(band?.hip.max).toBe(114); // the 140 outlier is above the 90th percentile
  });

  it("reports sizes with too few good fits instead of guessing", () => {
    const s = suggestChart([entry("XL", 110), entry("XL", 111)], order);
    expect(s.suggestions).toHaveLength(0);
    expect(s.insufficient).toEqual([
      { label: "XL", goodCount: 2 },
      { label: "2XL", goodCount: 0 },
      { label: "3XL", goodCount: 0 },
    ]);
  });

  it("warns when neighbouring sizes overlap or are out of order", () => {
    const entries = [
      ...[110, 112, 114].map((h) => entry("XL", h)),
      ...[113, 115, 117].map((h) => entry("2XL", h)),
    ];
    const s = suggestChart(entries, order);
    expect(s.warnings.join(" ")).toMatch(/XL and 2XL overlap on hip/);
  });

  it("counts opacity failures separately", () => {
    const entries = [{ ...entry("XL", 110), opacityOk: false }, entry("XL", 111)];
    expect(suggestChart(entries, order).opacityFailures).toBe(1);
  });
});

describe("buildDraftChart", () => {
  it("replaces only the sizes that have suggestions", () => {
    const entries = [110, 111, 112].map((h) => entry("XL", h));
    const draft = buildDraftChart(sampleLegging, suggestChart(entries, ["XL", "2XL"]));
    expect(draft.bands[0]?.hip).toEqual({ min: 110, max: 112 });
    expect(draft.bands[1]).toEqual(sampleLegging.bands[1]); // 2XL untouched
    expect(draft.productId).toBe(sampleLegging.productId);
  });
});
