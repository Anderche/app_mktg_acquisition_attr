// Pure builders that map API rows to ECharts options. Kept free of React so
// the data mapping can be unit-tested.
import type { EChartsOption } from "echarts";
import type { AttributionRow, ChannelRow, DailyPoint, KpiValues, RemovalEffectRow, SankeyResponse } from "../api";
import { MODELS } from "../api";
import { fmtDelta, fmtInt, fmtPct, fmtUsd, fmtUsdCompact, pctChange } from "../format";
import { channelColor, MODEL_LABELS, type ChartTheme } from "../theme";

const FONT = '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif';

function tooltipBase(t: ChartTheme) {
  return {
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    padding: [8, 10] as [number, number],
    textStyle: { color: t.text, fontFamily: FONT, fontSize: 12 },
    extraCssText: "box-shadow: 0 4px 16px rgba(0,0,0,0.12); border-radius: 8px;",
  };
}

function axisLabel(t: ChartTheme) {
  return { color: t.muted, fontFamily: FONT, fontSize: 11 };
}

function swatch(color: string) {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></span>`;
}

// --- sparkline -----------------------------------------------------------------

export type SparkMetric = keyof KpiValues;

export function sparklineOption(
  daily: DailyPoint[],
  metric: SparkMetric,
  t: ChartTheme,
  format: (n: number) => string,
  band?: { mean: number; std: number },
): EChartsOption {
  // Shaded mean ± 1σ band behind the line, so a reader sees which days are unusual.
  const markArea =
    band && band.std > 0
      ? {
          silent: true,
          itemStyle: { color: t.spark, opacity: 0.12 },
          data: [[{ yAxis: Math.max(0, band.mean - band.std) }, { yAxis: band.mean + band.std }] as [{ yAxis: number }, { yAxis: number }]],
        }
      : undefined;
  return {
    animation: false,
    grid: { left: 2, right: 2, top: 4, bottom: 2 },
    xAxis: { type: "category", show: false, data: daily.map((d) => d.date), boundaryGap: false },
    yAxis: { type: "value", show: false, min: 0 },
    tooltip: {
      ...tooltipBase(t),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: t.axis, width: 1 } },
      formatter: (params: unknown) => {
        const p = (params as { axisValue: string; value: number }[])[0];
        const avg = band ? `<div style="color:${t.muted};font-size:11px">mean ${format(band.mean)} ± ${format(band.std)}</div>` : "";
        return `<div style="color:${t.muted};font-size:11px">${p.axisValue}</div><b>${format(p.value)}</b>${avg}`;
      },
    },
    series: [
      {
        type: "line",
        data: daily.map((d) => d[metric]),
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.5, color: t.spark },
        itemStyle: { color: t.spark },
        ...(markArea ? { markArea } : { areaStyle: { color: t.spark, opacity: 0.08 } }),
      },
    ],
  };
}

// --- revenue by channel (horizontal bars) --------------------------------------

export function channelRevenueOption(rows: ChannelRow[], t: ChartTheme): EChartsOption {
  const sorted = [...rows].sort((a, b) => a.revenue - b.revenue); // largest on top
  return {
    animationDuration: 300,
    grid: { left: 8, right: 64, top: 8, bottom: 24, containLabel: true },
    xAxis: {
      type: "value",
      splitNumber: 4,
      axisLabel: { ...axisLabel(t), hideOverlap: true, formatter: (v: number) => fmtUsdCompact(v) },
      splitLine: { lineStyle: { color: t.grid, width: 1 } },
      axisLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: sorted.map((r) => r.channel),
      axisLabel: { ...axisLabel(t), color: t.textSecondary, fontSize: 12 },
      axisLine: { lineStyle: { color: t.axis } },
      axisTick: { show: false },
    },
    tooltip: {
      ...tooltipBase(t),
      trigger: "item",
      formatter: (p: unknown) => {
        const { dataIndex } = p as { dataIndex: number };
        const r = sorted[dataIndex];
        return `${swatch(channelColor(r.channel, t.mode))}<b>${r.channel}</b><br/>
          Revenue <b>${fmtUsd(r.revenue)}</b> (${fmtPct(r.revenue_share)})<br/>
          Conversions ${fmtInt(r.conversions)} · CVR ${fmtPct(r.conversion_rate, 2)}`;
      },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 22,
        data: sorted.map((r) => ({
          value: r.revenue,
          itemStyle: { color: channelColor(r.channel, t.mode), borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true,
          position: "right",
          color: t.textSecondary,
          fontFamily: FONT,
          fontSize: 11,
          formatter: (p: unknown) => fmtUsdCompact((p as { value: number }).value),
        },
      },
    ],
  };
}

// --- attribution comparison (grouped bars) ---------------------------------------

/** % change in a channel's credit under `model` relative to last click. */
export function vsLastClick(r: AttributionRow, model: (typeof MODELS)[number]): number | null {
  return pctChange(r[model], r.last_click);
}

/**
 * The channel the four models disagree on most, relative to its size. Channels
 * with under 5% of the credit are skipped: on tiny volumes the CV is noise.
 */
export function mostDisputed(rows: AttributionRow[]): AttributionRow | null {
  const mean = (r: AttributionRow) => MODELS.reduce((s, m) => s + r[m], 0) / MODELS.length;
  const total = rows.reduce((s, r) => s + mean(r), 0);
  const big = rows.filter((r) => total > 0 && mean(r) >= total * 0.05);
  return big.length ? big.reduce((a, b) => (b.model_cv > a.model_cv ? b : a)) : null;
}

export type AttributionMetric = "conversions" | "revenue";

export function attributionOption(
  rows: AttributionRow[],
  metric: AttributionMetric,
  t: ChartTheme,
): EChartsOption {
  const fmt = metric === "revenue" ? fmtUsd : (n: number) => fmtInt(n);
  return {
    animationDuration: 300,
    legend: {
      top: 0,
      left: 0,
      itemWidth: 10,
      itemHeight: 10,
      icon: "roundRect",
      textStyle: { color: t.textSecondary, fontFamily: FONT, fontSize: 12 },
      data: MODELS.map((m) => MODEL_LABELS[m]),
    },
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: rows.map((r) => r.channel),
      axisLabel: { ...axisLabel(t), color: t.textSecondary, interval: 0, fontSize: 11 },
      axisLine: { lineStyle: { color: t.axis } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        ...axisLabel(t),
        formatter: (v: number) => (metric === "revenue" ? fmtUsdCompact(v) : fmtInt(v)),
      },
      splitLine: { lineStyle: { color: t.grid } },
    },
    tooltip: {
      ...tooltipBase(t),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: t.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(11,11,11,0.04)" } },
      formatter: (params: unknown) => {
        const ps = params as { dataIndex: number }[];
        const r = rows[ps[0].dataIndex];
        const lines = MODELS.map((m) => {
          const change = m === "last_click" ? "" : ` <span style="color:${t.muted}">${fmtDelta(vsLastClick(r, m))}</span>`;
          return `${swatch(t.models[m])}${MODEL_LABELS[m]} <b style="float:right;margin-left:16px">${fmt(r[m])}${change}</b>`;
        });
        return `<b>${r.channel}</b><br/>${lines.join("<br/>")}<div style="margin-top:4px;color:${t.muted}">Model spread σ ${fmt(r.model_std)} · CV ${fmtPct(r.model_cv, 0)}</div>`;
      },
    },
    series: MODELS.map((m) => ({
      name: MODEL_LABELS[m],
      type: "bar" as const,
      barGap: "12%",
      barMaxWidth: 18,
      data: rows.map((r) => r[m]),
      itemStyle: { color: t.models[m], borderRadius: [4, 4, 0, 0] },
      emphasis: { focus: "series" as const },
    })),
  };
}

export function removalEffectsOption(rows: RemovalEffectRow[], t: ChartTheme): EChartsOption {
  const sorted = [...rows].sort((a, b) => a.share - b.share);
  return {
    animationDuration: 300,
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", show: false, max: (v: { max: number }) => v.max * 1.05 },
    yAxis: {
      type: "category",
      data: sorted.map((r) => r.channel),
      axisLabel: { ...axisLabel(t), color: t.textSecondary },
      axisLine: { lineStyle: { color: t.axis } },
      axisTick: { show: false },
    },
    tooltip: {
      ...tooltipBase(t),
      trigger: "item",
      formatter: (p: unknown) => {
        const r = sorted[(p as { dataIndex: number }).dataIndex];
        return `${swatch(channelColor(r.channel, t.mode))}<b>${r.channel}</b><br/>
          Removal effect <b>${fmtPct(r.removal_effect)}</b><br/>
          <span style="color:${t.muted}">Share of all removal effects: ${fmtPct(r.share)}</span>`;
      },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        data: sorted.map((r) => ({
          value: r.share,
          itemStyle: { color: channelColor(r.channel, t.mode), borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true,
          position: "right",
          color: t.textSecondary,
          fontFamily: FONT,
          fontSize: 11,
          formatter: (p: unknown) => fmtPct((p as { value: number }).value, 0),
        },
      },
    ],
  };
}

// --- conversion paths (Sankey) -----------------------------------------------

export function sankeyOption(data: SankeyResponse, t: ChartTheme, opts: { compact?: boolean } = {}): EChartsOption {
  const compact = opts.compact ?? false;
  const nodeColor = (channel: string) =>
    channel === "Purchase" ? t.purchase : channelColor(channel, t.mode);
  const byName = new Map(data.nodes.map((n) => [n.name, n]));
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const l of data.links) {
    inflow.set(l.target, (inflow.get(l.target) ?? 0) + l.value);
    outflow.set(l.source, (outflow.get(l.source) ?? 0) + l.value);
  }
  const shown = data.paths.reduce((s, p) => s + p.conversions, 0);
  // In the compact preview only label nodes big enough to hold text.
  const labelled = (name: string, step: number | null) =>
    !compact || step === null || step === 1 || Math.max(inflow.get(name) ?? 0, outflow.get(name) ?? 0) >= shown * 0.08;
  const layout = compact ? SANKEY_COMPACT_LAYOUT : SANKEY_LAYOUT;

  return {
    animationDuration: 300,
    tooltip: {
      ...tooltipBase(t),
      trigger: "item",
      formatter: (p: unknown) => {
        const { dataType, data: d } = p as {
          dataType: "node" | "edge";
          data: { name?: string; source?: string; target?: string; value?: number; share?: number };
        };
        if (dataType === "edge") {
          const src = byName.get(d.source!);
          const tgt = byName.get(d.target!);
          return `${swatch(nodeColor(src?.channel ?? ""))}${src?.channel} <span style="color:${t.muted}">step ${src?.step}</span>
            → ${tgt?.step ? `${tgt.channel} <span style="color:${t.muted}">step ${tgt.step}</span>` : "<b>Purchase</b>"}<br/>
            <b>${fmtInt(d.value ?? 0)}</b> conversions · ${fmtPct(d.share ?? 0)} of all`;
        }
        const node = byName.get(d.name!);
        const value = Math.max(inflow.get(d.name!) ?? 0, outflow.get(d.name!) ?? 0);
        if (!node || node.step === null) {
          return `<b>Purchase</b><br/>${fmtInt(shown)} of ${fmtInt(data.total_conversions)} conversions shown (${fmtPct(data.total_conversions ? shown / data.total_conversions : 0)})`;
        }
        return `${swatch(nodeColor(node.channel))}<b>${node.channel}</b> · step ${node.step}<br/>${fmtInt(value)} conversions pass through`;
      },
    },
    series: [
      {
        type: "sankey",
        ...layout,
        nodeGap: compact ? 6 : 10,
        // "justify" puts every step-n node in column n-1 and the sink (Purchase)
        // in the last column, so columns line up with journey steps.
        nodeAlign: "justify",
        layoutIterations: 64,
        draggable: false,
        emphasis: { focus: "adjacency" },
        data: data.nodes.map((n) => ({
          name: n.name,
          itemStyle: { color: nodeColor(n.channel), borderColor: t.surface, borderWidth: 1 },
          label: { show: labelled(n.name, n.step), formatter: n.step === null ? "Purchase" : n.channel },
        })),
        links: data.links.map((l) => ({ ...l })),
        lineStyle: { color: "source", opacity: t.mode === "dark" ? 0.35 : 0.28, curveness: 0.5 },
        label: { color: t.textSecondary, fontFamily: FONT, fontSize: compact ? 10 : 11 },
      },
    ],
  };
}

// Sankey geometry shared with the HTML step headers drawn above the chart.
export const SANKEY_LAYOUT = { left: 8, right: 96, top: 8, bottom: 8, nodeWidth: 12 } as const;
const SANKEY_COMPACT_LAYOUT = { left: 4, right: 64, top: 4, bottom: 4, nodeWidth: 10 } as const;

/**
 * The Sankey for only the top `n` journeys, rebuilt from an already-fetched
 * response so the hero preview needs no request of its own.
 */
export function topPathsSankey(data: SankeyResponse, n: number): SankeyResponse {
  const paths = data.paths.slice(0, n);
  const nodes = new Map<string, SankeyResponse["nodes"][number]>();
  const links = new Map<string, { source: string; target: string; value: number }>();
  for (const p of paths) {
    const chain = p.path.split(" > ").map((channel, i) => {
      const name = `${channel} · ${i + 1}`;
      if (!nodes.has(name)) nodes.set(name, { name, channel, step: i + 1 });
      return name;
    });
    chain.push("Purchase");
    for (let i = 0; i < chain.length - 1; i++) {
      const key = `${chain[i]}→${chain[i + 1]}`;
      const link = links.get(key) ?? { source: chain[i], target: chain[i + 1], value: 0 };
      link.value += p.conversions;
      links.set(key, link);
    }
  }
  if (paths.length) nodes.set("Purchase", { name: "Purchase", channel: "Purchase", step: null });
  const total = data.total_conversions;
  return {
    nodes: [...nodes.values()],
    links: [...links.values()].map((l) => ({ ...l, share: total ? l.value / total : 0 })),
    paths,
    total_conversions: total,
  };
}

/** Deepest journey step present; Purchase sits one column to its right. */
export function sankeyMaxStep(data: SankeyResponse): number {
  return data.nodes.reduce((m, n) => Math.max(m, n.step ?? 0), 0);
}
