import { describe, expect, it } from "vitest";
import { recommendSize, sampleBra, sampleLegging } from "./index";

// Placeholder chart: hip XL 108-115, 2XL 116-123, 3XL 124-131 ...
// waist XL 88-95, 2XL 96-103 ...; bust XL 100-107, 2XL 108-115 ...
const m = (hipCm: number, waistCm: number, bustCm: number) => ({
  heightCm: 165,
  hipCm,
  waistCm,
  bustCm,
});

describe("recommendSize: band selection", () => {
  it("picks the band all measurements fall in", () => {
    const r = recommendSize(sampleLegging, m(120, 100, 112));
    expect(r.status).toBe("ok");
    expect(r.size).toBe("2XL");
    expect(r.alternateSize).toBeNull();
  });

  it("uses the larger band when hip and waist differ", () => {
    const r = recommendSize(sampleLegging, m(111, 108, 104)); // hip XL, waist 3XL(104-111)
    expect(r.size).toBe("3XL");
  });
});

describe("recommendSize: band edges", () => {
  it("mid-band values give one size", () => {
    expect(recommendSize(sampleLegging, m(112, 92, 104)).alternateSize).toBeNull();
  });

  it("within 1 cm of the upper edge shows the next size up", () => {
    const r = recommendSize(sampleLegging, m(115, 92, 104)); // hip at XL max
    expect(r.size).toBe("XL");
    expect(r.alternateSize).toBe("2XL");
    expect(r.alternateDirection).toBe("up");
    expect(r.notes.join(" ")).toMatch(/between XL and 2XL/);
  });

  it("exactly 1 cm from the upper edge still triggers", () => {
    const r = recommendSize(sampleLegging, m(114, 92, 104));
    expect(r.alternateSize).toBe("2XL");
  });

  it("2 cm from the upper edge does not trigger", () => {
    const r = recommendSize(sampleLegging, m(113, 92, 104));
    expect(r.alternateSize).toBeNull();
  });

  it("within 1 cm of the lower edge shows the next size down", () => {
    const r = recommendSize(sampleLegging, m(117, 97, 110)); // all 1 cm above 2XL min
    expect(r.size).toBe("2XL");
    expect(r.alternateSize).toBe("XL");
    expect(r.alternateDirection).toBe("down");
  });

  it("lower edge only counts when every deciding measurement is near it", () => {
    const r = recommendSize(sampleLegging, m(117, 100, 110)); // waist mid-band
    expect(r.alternateSize).toBeNull();
  });

  it("no size down below the smallest band", () => {
    const r = recommendSize(sampleLegging, m(108, 88, 100));
    expect(r.size).toBe("XL");
    expect(r.alternateSize).toBeNull();
  });

  it("no size up above the largest band", () => {
    const r = recommendSize(sampleLegging, m(155, 135, 147));
    expect(r.size).toBe("6XL");
    expect(r.alternateSize).toBeNull();
  });

  it("a value in the gap between bands goes to the larger band", () => {
    const r = recommendSize(sampleLegging, m(115.5, 92, 104));
    expect(r.size).toBe("2XL");
    expect(r.alternateSize).toBe("XL"); // 0.5 cm above the 2XL lower edge
  });
});

describe("recommendSize: ties and bust", () => {
  it("hip and waist in the same band is a clean tie", () => {
    const r = recommendSize(sampleLegging, m(120, 100, 112));
    expect(r.size).toBe("2XL");
  });

  it("larger bust flags bra one size up", () => {
    const r = recommendSize(sampleBra, m(112, 92, 120)); // hip XL, bust 3XL
    expect(r.bustOneSizeUp).toBe(true);
    expect(r.size).toBe("2XL");
  });

  it("larger bust leaves a legging size alone but tells the customer", () => {
    const r = recommendSize(sampleLegging, m(112, 92, 120));
    expect(r.size).toBe("XL");
    expect(r.bustOneSizeUp).toBe(true);
    expect(r.notes.join(" ")).toMatch(/one size up/);
  });

  it("bust-driven size up is capped at the largest size", () => {
    const r = recommendSize(sampleBra, m(150, 130, 160));
    expect(r.size).toBe("6XL");
  });

  it("equal bust band does not flag", () => {
    expect(recommendSize(sampleBra, m(120, 100, 112)).bustOneSizeUp).toBe(false);
  });
});

describe("recommendSize: out of range", () => {
  it("above the chart returns no size", () => {
    const r = recommendSize(sampleLegging, m(160, 100, 112));
    expect(r.status).toBe("out_of_range");
    expect(r.size).toBeNull();
  });

  it("below the chart returns no size", () => {
    const r = recommendSize(sampleLegging, m(100, 80, 90));
    expect(r.status).toBe("out_of_range");
  });
});
