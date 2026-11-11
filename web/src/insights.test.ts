import type { AttributionRow, CampaignRow } from "./api";
import { bestCampaignInsight, markovGainInsight, topJourneyInsight } from "./insights";

const attr = (channel: string, last_click: number, markov: number): AttributionRow => ({
  channel,
  last_click,
  first_click: 0,
  linear: 0,
  markov,
});

const campaign = (name: string, sessions: number, conversions: number): CampaignRow => ({
  campaign: name,
  source_medium: "google / cpc",
  channel: "Paid Search",
  sessions,
  conversions,
  conversion_rate: conversions / sessions,
  revenue: conversions * 50,
  revenue_per_session: (conversions * 50) / sessions,
});

describe("markovGainInsight", () => {
  it("picks the channel with the largest gain and links to attribution", () => {
    const i = markovGainInsight([attr("Direct", 900, 800), attr("Organic Search", 324, 492)]);
    expect(i).toEqual({ id: "markov-gain", text: "Organic Search gains most under Markov: 324 → 492", section: "attribution" });
  });

  it("is omitted when no channel gains", () => {
    expect(markovGainInsight([attr("Direct", 900, 900)])).toBeNull();
    expect(markovGainInsight(undefined)).toBeNull();
  });
});

describe("topJourneyInsight", () => {
  it("describes the most common path", () => {
    const i = topJourneyInsight([{ path: "Organic Search > Direct", conversions: 10, share: 0.2, revenue: 500 }]);
    expect(i?.text).toBe("Top journey: Organic Search → Direct → Purchase (20.0%)");
    expect(i?.section).toBe("paths");
  });

  it("is omitted without paths", () => {
    expect(topJourneyInsight([])).toBeNull();
  });
});

describe("bestCampaignInsight", () => {
  it("ignores GA4 placeholders and small samples", () => {
    const i = bestCampaignInsight([
      campaign("(referral)", 5000, 500),
      campaign("<Other>", 5000, 400),
      campaign("Tiny_Test", 20, 10),
      campaign("Cyber_Monday_Email", 1000, 70),
      campaign("Apparel_Generic", 4000, 40),
    ]);
    expect(i?.text).toBe("Best campaign CVR: Cyber_Monday_Email (7.00%)");
    expect(i?.section).toBe("campaigns");
  });

  it("is omitted when the best real campaign is below the blended rate", () => {
    expect(bestCampaignInsight([campaign("(referral)", 10000, 1000), campaign("Data_Share_Promo", 2000, 3)])).toBeNull();
  });
});
