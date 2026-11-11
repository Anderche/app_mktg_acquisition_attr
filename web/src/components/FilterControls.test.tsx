import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FiltersProvider } from "../filters";
import { FilterControls, FilterSheet } from "./FilterControls";

function renderWith(ui: React.ReactNode, search = "") {
  window.history.replaceState(null, "", `/${search}`);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FiltersProvider>{ui}</FiltersProvider>
    </QueryClientProvider>,
  );
}

describe("<FilterControls>", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("keeps every inline control labelled for screen readers", () => {
    renderWith(<FilterControls layout="inline" />);
    for (const name of ["Date range", "From", "To", "Device", "Country"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it("updates the URL when a preset is chosen", async () => {
    renderWith(<FilterControls layout="stacked" />);
    await userEvent.selectOptions(screen.getByLabelText("Date range"), "dec");
    expect(window.location.search).toBe("?start=2020-12-01&end=2020-12-31");
  });
});

describe("<FilterSheet>", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("shows how many filters are active on its button", () => {
    renderWith(<FilterSheet />, "?device=mobile&country=Canada");
    expect(screen.getByRole("button", { name: /Filters\s*2/ })).toBeInTheDocument();
  });

  it("shows no count when nothing is filtered", () => {
    renderWith(<FilterSheet />);
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });
});
