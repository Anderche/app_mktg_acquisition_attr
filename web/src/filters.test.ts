import { toQuery } from "./api";
import { DEFAULT_FILTERS, filtersFromSearch, filtersToSearch, presetFor } from "./filters";

describe("filters", () => {
  it("round-trips through the URL", () => {
    const f = { start: "2020-12-01", end: "2020-12-31", device: "mobile", country: "Canada" };
    expect(filtersFromSearch(filtersToSearch(f))).toEqual(f);
  });

  it("omits defaults from the URL", () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe("");
  });

  it("falls back to defaults for malformed or inverted dates", () => {
    expect(filtersFromSearch("?start=yesterday")).toEqual(DEFAULT_FILTERS);
    expect(filtersFromSearch("?start=2021-01-20&end=2021-01-01")).toEqual(DEFAULT_FILTERS);
  });

  it("recognises presets", () => {
    expect(presetFor({ start: "2020-12-01", end: "2020-12-31" })?.id).toBe("dec");
    expect(presetFor({ start: "2020-12-02", end: "2020-12-31" })).toBeUndefined();
  });

  it("drops 'all' filters from API queries", () => {
    expect(toQuery({ ...DEFAULT_FILTERS, top: 20 })).toBe("?start=2020-11-01&end=2021-01-31&top=20");
  });
});
