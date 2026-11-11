import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { REFERENCE_TILES } from "../content/reference";
import { SECTIONS } from "../sections";
import { HIDE_KEY, ReferenceTiles } from "./ReferenceTiles";

const META = {
  source: "bigquery",
  dataset: "x",
  generated_at: "2026-11-11T17:27:00+00:00",
  start_date: "2020-11-01",
  end_date: "2021-01-31",
  lookback_days: 30,
  stats: { sessions: 360129, users: 270154, conversions: 4848, distinct_paths: 2431 },
  limitations: [],
  devices: [],
  countries: [],
  channels: [],
};

function renderTiles() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReferenceTiles />
    </QueryClientProvider>,
  );
}

describe("<ReferenceTiles>", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(META), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the three tiles and live source counts", async () => {
    renderTiles();
    expect(screen.getByRole("heading", { name: "Source data" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it extends to your data" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Who it helps" })).toBeInTheDocument();

    const source = screen.getByRole("article", { name: "Source data" });
    expect(await within(source).findByText("360.1K")).toBeInTheDocument();
    expect(within(source).getByText("4.8K")).toBeInTheDocument();
    expect(within(source).getByText(/Real BigQuery extract/)).toBeInTheDocument();
  });

  it("hides and remembers the choice", async () => {
    renderTiles();
    await userEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByRole("heading", { name: "Source data" })).not.toBeInTheDocument();
    expect(localStorage.getItem(HIDE_KEY)).toBe("1");
    expect(screen.getByRole("button", { name: "Show" })).toHaveAttribute("aria-expanded", "false");
  });

  it("starts hidden when the viewer hid it before", () => {
    localStorage.setItem(HIDE_KEY, "1");
    renderTiles();
    expect(screen.queryByRole("heading", { name: "Who it helps" })).not.toBeInTheDocument();
  });

  it("links every tile to a real section", () => {
    const ids = new Set<string>(SECTIONS.map((s) => s.id));
    for (const tile of REFERENCE_TILES) expect(ids.has(tile.link.section)).toBe(true);
  });
});
