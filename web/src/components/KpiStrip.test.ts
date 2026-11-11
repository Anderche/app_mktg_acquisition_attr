import type { KpiResponse, KpiValues } from "../api";
import { momChange } from "./KpiStrip";

const kpi = (sessions: number): KpiValues => ({
  users: sessions,
  sessions,
  conversions: 1,
  revenue: 10,
  conversion_rate: 0.01,
  aov: 10,
});

const base: KpiResponse = {
  current: kpi(300),
  previous: null,
  previous_start: "2020-10-01",
  previous_end: "2020-10-31",
  daily: [],
  stats: {} as KpiResponse["stats"],
  mom: { label: "Jan 2021 vs Dec 2020", current: kpi(110), previous: kpi(100) },
  yoy: null,
  yoy_note: "Year-over-year needs 13+ months of data; this extract covers 3.",
};

describe("momChange", () => {
  it("compares the last full month with the one before", () => {
    expect(momChange(base, "sessions")).toBeCloseTo(0.1);
  });

  it("is hidden when it would repeat the vs-prior figure (a one-month range)", () => {
    const oneMonth = { ...base, current: kpi(110), previous: kpi(100) };
    expect(momChange(oneMonth, "sessions")).toBeNull();
  });

  it("is null without a month-over-month window", () => {
    expect(momChange({ ...base, mom: null }, "sessions")).toBeNull();
  });
});
