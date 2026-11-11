import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { REFERENCE_TILES } from "../content/reference";
import { SECTIONS } from "../sections";
import { OPEN_KEY, ReferenceTiles } from "./ReferenceTiles";

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

  it("starts collapsed: three chips, no tile content", async () => {
    renderTiles();
    const chips = screen.getAllByRole("button");
    expect(chips).toHaveLength(3);
    for (const chip of chips) expect(chip).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", { name: /Source data/ })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Source data · 360\.1K sessions/ })).toBeInTheDocument();
  });

  it("opens a tile in place with live counts, and remembers it", async () => {
    renderTiles();
    await userEvent.click(screen.getByRole("button", { name: /Source data/ }));
    const tile = screen.getByRole("article", { name: /Source data/ });
    expect(await within(tile).findByText("270.2K")).toBeInTheDocument();
    expect(within(tile).getByText(/Real BigQuery extract/)).toBeInTheDocument();
    expect(localStorage.getItem(OPEN_KEY)).toBe("source");

    await userEvent.click(screen.getByRole("button", { name: /Who it helps/ }));
    expect(screen.queryByRole("article", { name: /Source data/ })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Who it helps/ })).toBeInTheDocument();
    expect(localStorage.getItem(OPEN_KEY)).toBe("audience");
  });

  it("closes again and forgets", async () => {
    localStorage.setItem(OPEN_KEY, "extend");
    renderTiles();
    const chip = screen.getByRole("button", { name: /How it extends/ });
    expect(chip).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(chip);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(localStorage.getItem(OPEN_KEY)).toBeNull();
  });

  it("links every tile to a real section", () => {
    const ids = new Set<string>(SECTIONS.map((s) => s.id));
    for (const tile of REFERENCE_TILES) expect(ids.has(tile.link.section)).toBe(true);
  });
});
