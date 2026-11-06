import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CampaignRow } from "../api";
import { CampaignTable, campaignsCsv, filterCampaigns, toneFor } from "./Campaigns";

const rows: CampaignRow[] = [
  {
    campaign: "Brand_Search_US",
    source_medium: "google / cpc",
    channel: "Paid Search",
    sessions: 1000,
    conversions: 40,
    conversion_rate: 0.04,
    revenue: 3000,
    revenue_per_session: 3,
  },
  {
    campaign: "Apparel_Generic",
    source_medium: "google / cpc",
    channel: "Paid Search",
    sessions: 800,
    conversions: 8,
    conversion_rate: 0.01,
    revenue: 500,
    revenue_per_session: 0.625,
  },
  {
    campaign: 'Quote, "test"',
    source_medium: "newsletter / email",
    channel: "Email",
    sessions: 50,
    conversions: 5,
    conversion_rate: 0.1,
    revenue: 400,
    revenue_per_session: 8,
  },
];

describe("campaign helpers", () => {
  it("flags rates 20% above/below the benchmark, ignoring small samples", () => {
    expect(toneFor(0.04, 0.025, 1000)).toBe("good");
    expect(toneFor(0.01, 0.025, 1000)).toBe("bad");
    expect(toneFor(0.026, 0.025, 1000)).toBeNull();
    expect(toneFor(0.1, 0.025, 50)).toBeNull();
  });

  it("searches campaign, source/medium and channel", () => {
    expect(filterCampaigns(rows, "email").map((r) => r.campaign)).toEqual(['Quote, "test"']);
    expect(filterCampaigns(rows, "  ")).toHaveLength(3);
  });

  it("escapes CSV cells", () => {
    const csv = campaignsCsv(rows).split("\n");
    expect(csv[0]).toBe("campaign,source_medium,channel,sessions,conversions,conversion_rate,revenue,revenue_per_session");
    expect(csv[3].startsWith('"Quote, ""test""",')).toBe(true);
  });
});

describe("<CampaignTable>", () => {
  it("sorts by revenue by default and re-sorts on header click", async () => {
    render(<CampaignTable rows={rows} />);
    const firstCell = () => within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0];
    expect(firstCell()).toHaveTextContent("Brand_Search_US");

    await userEvent.click(screen.getByRole("button", { name: /CVR/ }));
    expect(firstCell()).toHaveTextContent('Quote, "test"');
  });

  it("filters rows from the search box", async () => {
    render(<CampaignTable rows={rows} />);
    await userEvent.type(screen.getByLabelText("Search campaigns"), "apparel");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });
});
