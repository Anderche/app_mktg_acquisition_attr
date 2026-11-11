import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_FILTERS, FiltersProvider } from "../filters";
import { activeFilterChips, ActiveFilters } from "./ActiveFilters";

function renderWithUrl(search: string) {
  window.history.replaceState(null, "", `/${search}`);
  return render(
    <FiltersProvider>
      <ActiveFilters />
    </FiltersProvider>,
  );
}

describe("activeFilterChips", () => {
  it("returns nothing for default filters", () => {
    expect(activeFilterChips(DEFAULT_FILTERS)).toEqual([]);
  });

  it("labels presets, custom ranges and dimensions", () => {
    const preset = activeFilterChips({ ...DEFAULT_FILTERS, start: "2020-12-01", end: "2020-12-31", device: "mobile" });
    expect(preset.map((c) => c.label)).toEqual(["Dec 2020", "Mobile"]);

    const custom = activeFilterChips({ ...DEFAULT_FILTERS, start: "2020-12-02", end: "2020-12-09", country: "Canada" });
    expect(custom[0].label).toBe("Dec 2, 2020 – Dec 9, 2020");
    expect(custom[1]).toMatchObject({ key: "country", label: "Canada", reset: { country: "all" } });
  });
});

describe("<ActiveFilters>", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("renders nothing when no filter is active", () => {
    const { container } = renderWithUrl("");
    expect(container).toBeEmptyDOMElement();
  });

  it("removes one filter and leaves the rest", async () => {
    renderWithUrl("?start=2020-12-01&end=2020-12-31&device=mobile");
    await userEvent.click(screen.getByRole("button", { name: "Remove filter: Mobile" }));
    expect(screen.queryByText("Mobile")).not.toBeInTheDocument();
    expect(screen.getByText("Dec 2020")).toBeInTheDocument();
    expect(window.location.search).toBe("?start=2020-12-01&end=2020-12-31");
  });

  it("clears everything", async () => {
    renderWithUrl("?device=tablet&country=Canada");
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.queryByRole("group", { name: "Active filters" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
