import { fmtDelta, fmtPct, fmtUsd, pctChange } from "./format";

describe("format", () => {
  it("formats currency and percentages", () => {
    expect(fmtUsd(1234.5)).toBe("$1,235");
    expect(fmtPct(0.02273, 2)).toBe("2.27%");
  });

  it("computes change only when there is a baseline", () => {
    expect(pctChange(110, 100)).toBeCloseTo(0.1);
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(5, null)).toBeNull();
  });

  it("signs deltas with a true minus", () => {
    expect(fmtDelta(0.148)).toBe("+14.8%");
    expect(fmtDelta(-0.021)).toBe("−2.1%");
    expect(fmtDelta(null)).toBe("—");
  });
});
