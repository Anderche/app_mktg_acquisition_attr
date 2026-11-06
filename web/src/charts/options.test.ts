import type { AttributionRow, ChannelRow, SankeyResponse } from "../api";
import { channelColor, chartTheme } from "../theme";
import { attributionOption, channelRevenueOption, sankeyMaxStep, sankeyOption } from "./options";

const light = chartTheme("light");

const attribution: AttributionRow[] = [
  { channel: "Organic Search", last_click: 324, first_click: 800, linear: 567.5, markov: 492.1 },
  { channel: "Direct", last_click: 972, first_click: 543, linear: 761.2, markov: 766.2 },
];

describe("attributionOption", () => {
  it("emits one series per model in fixed order with values per channel", () => {
    const opt = attributionOption(attribution, "conversions", light);
    const series = opt.series as { name: string; data: number[]; itemStyle: { color: string } }[];
    expect(series.map((s) => s.name)).toEqual(["Last click", "First click", "Linear", "Markov"]);
    expect(series[3].data).toEqual([492.1, 766.2]);
    expect(series[3].itemStyle.color).toBe(light.models.markov);
    expect((opt.xAxis as { data: string[] }).data).toEqual(["Organic Search", "Direct"]);
  });
});

describe("channelRevenueOption", () => {
  it("keeps each channel's color regardless of rank", () => {
    const rows: ChannelRow[] = [
      { channel: "Email", users: 1, sessions: 1, conversions: 1, revenue: 50, conversion_rate: 1, revenue_share: 0.5 },
      { channel: "Direct", users: 1, sessions: 1, conversions: 1, revenue: 30, conversion_rate: 1, revenue_share: 0.3 },
    ];
    const opt = channelRevenueOption(rows, light);
    const y = (opt.yAxis as { data: string[] }).data;
    const data = (opt.series as { data: { itemStyle: { color: string } }[] }[])[0].data;
    y.forEach((channel, i) => expect(data[i].itemStyle.color).toBe(channelColor(channel, "light")));
  });
});

describe("sankeyOption", () => {
  const sankey: SankeyResponse = {
    nodes: [
      { name: "Organic Search · 1", channel: "Organic Search", step: 1 },
      { name: "Direct · 2", channel: "Direct", step: 2 },
      { name: "Purchase", channel: "Purchase", step: null },
    ],
    links: [
      { source: "Organic Search · 1", target: "Direct · 2", value: 5, share: 0.5 },
      { source: "Direct · 2", target: "Purchase", value: 5, share: 0.5 },
    ],
    paths: [{ path: "Organic Search > Direct", conversions: 5, share: 0.5, revenue: 300 }],
    total_conversions: 10,
  };

  it("colors nodes by channel and labels them by channel name", () => {
    const series = (sankeyOption(sankey, light).series as { data: { name: string; itemStyle: { color: string }; label: { formatter: string } }[] }[])[0];
    const organic = series.data.find((n) => n.name === "Organic Search · 1")!;
    expect(organic.itemStyle.color).toBe(channelColor("Organic Search", "light"));
    expect(organic.label.formatter).toBe("Organic Search");
    expect(series.data.find((n) => n.name === "Purchase")!.itemStyle.color).toBe(light.purchase);
  });

  it("reports the deepest step", () => {
    expect(sankeyMaxStep(sankey)).toBe(2);
  });
});
