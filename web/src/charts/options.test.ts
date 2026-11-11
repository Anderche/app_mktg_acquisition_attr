import type { AttributionRow, ChannelRow, DailyPoint, SankeyResponse } from "../api";
import { channelColor, chartTheme } from "../theme";
import {
  attributionOption,
  channelRevenueOption,
  mostDisputed,
  sankeyMaxStep,
  sankeyOption,
  sparklineOption,
  topPathsSankey,
  vsLastClick,
} from "./options";

const light = chartTheme("light");

const attribution: AttributionRow[] = [
  { channel: "Organic Search", last_click: 324, first_click: 800, linear: 567.5, markov: 492.1, model_std: 170, model_cv: 0.31 },
  { channel: "Direct", last_click: 972, first_click: 543, linear: 761.2, markov: 766.2, model_std: 152, model_cv: 0.2 },
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

describe("topPathsSankey", () => {
  const full: SankeyResponse = {
    nodes: [],
    links: [],
    paths: [
      { path: "Organic Search > Direct", conversions: 6, share: 0.3, revenue: 300 },
      { path: "Direct", conversions: 4, share: 0.2, revenue: 200 },
      { path: "Email > Direct", conversions: 2, share: 0.1, revenue: 100 },
    ],
    total_conversions: 20,
  };

  it("rebuilds nodes and links from only the top n paths", () => {
    const s = topPathsSankey(full, 2);
    expect(s.paths).toHaveLength(2);
    expect(s.nodes.map((n) => n.name).sort()).toEqual(["Direct · 1", "Direct · 2", "Organic Search · 1", "Purchase"]);
    const into = s.links.filter((l) => l.target === "Purchase").reduce((a, l) => a + l.value, 0);
    expect(into).toBe(10);
    expect(s.links.find((l) => l.source === "Organic Search · 1")).toMatchObject({ target: "Direct · 2", value: 6, share: 0.3 });
    expect(s.total_conversions).toBe(20);
  });

  it("is empty when there are no paths", () => {
    expect(topPathsSankey({ ...full, paths: [] }, 8)).toMatchObject({ nodes: [], links: [] });
  });

  it("compact mode hides labels on small middle nodes", () => {
    const s = topPathsSankey(
      { ...full, paths: [...full.paths, { path: "Referral > Paid Search", conversions: 1, share: 0.05, revenue: 10 }] },
      4,
    );
    const nodes = (sankeyOption(s, light, { compact: true }).series as { data: { name: string; label: { show: boolean } }[] }[])[0].data;
    expect(nodes.find((n) => n.name === "Paid Search · 2")!.label.show).toBe(false);
    expect(nodes.find((n) => n.name === "Referral · 1")!.label.show).toBe(true);
    expect(nodes.find((n) => n.name === "Purchase")!.label.show).toBe(true);
  });
});

describe("sparklineOption", () => {
  const daily = [10, 20, 30].map(
    (v, i): DailyPoint => ({ date: `2020-11-0${i + 1}`, users: v, sessions: v, conversions: 1, revenue: v, conversion_rate: 0.1, aov: v }),
  );

  it("draws a mean ± σ band when stats are given", () => {
    const series = (sparklineOption(daily, "users", light, String, { mean: 20, std: 10 }).series as Record<string, unknown>[])[0];
    expect(series.markArea).toMatchObject({ data: [[{ yAxis: 10 }, { yAxis: 30 }]] });
    expect(series.areaStyle).toBeUndefined();
  });

  it("clips the band at zero and falls back to an area fill without stats", () => {
    const banded = (sparklineOption(daily, "users", light, String, { mean: 5, std: 10 }).series as Record<string, unknown>[])[0];
    expect(banded.markArea).toMatchObject({ data: [[{ yAxis: 0 }, { yAxis: 15 }]] });
    const plain = (sparklineOption(daily, "users", light, String).series as Record<string, unknown>[])[0];
    expect(plain.markArea).toBeUndefined();
    expect(plain.areaStyle).toBeDefined();
  });
});

describe("attribution stats helpers", () => {
  it("computes each model's change against last click", () => {
    expect(vsLastClick(attribution[0], "markov")).toBeCloseTo((492.1 - 324) / 324);
    expect(vsLastClick({ ...attribution[0], last_click: 0 }, "markov")).toBeNull();
  });

  it("finds the channel the models disagree on most, relative to size", () => {
    expect(mostDisputed(attribution)?.channel).toBe("Organic Search");
    expect(mostDisputed([])).toBeNull();
  });

  it("ignores channels too small for their CV to mean anything", () => {
    const tiny: AttributionRow = { channel: "Email", last_click: 5, first_click: 2, linear: 4, markov: 3, model_std: 1.1, model_cv: 0.32 };
    expect(mostDisputed([...attribution, tiny])?.channel).toBe("Organic Search");
  });
});
