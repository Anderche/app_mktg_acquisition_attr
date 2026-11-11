import { useMemo } from "react";
import type { KpiResponse, KpiValues } from "../api";
import { sparklineOption } from "../charts/options";
import { fmtCompact, fmtDateRange, fmtDelta, fmtInt, fmtPct, fmtUsd, fmtUsd2, fmtUsdCompact, pctChange } from "../format";
import { useKpis } from "../queries";
import { useChartTheme } from "../theme";
import { Card, ErrorNote, Skeleton } from "./Card";
import { Chart } from "./Chart";

interface KpiDef {
  key: keyof KpiValues;
  label: string;
  format: (n: number) => string;
  /** Format for the daily standard deviation. */
  spread: (n: number) => string;
}

const KPIS: KpiDef[] = [
  { key: "users", label: "Users", format: fmtInt, spread: fmtCompact },
  { key: "sessions", label: "Sessions", format: fmtInt, spread: fmtCompact },
  { key: "conversions", label: "Conversions", format: fmtInt, spread: (n) => n.toFixed(1) },
  { key: "revenue", label: "Revenue", format: fmtUsd, spread: fmtUsdCompact },
  { key: "conversion_rate", label: "Conversion rate", format: (n) => fmtPct(n, 2), spread: (n) => `${(n * 100).toFixed(2)} pp` },
  { key: "aov", label: "Avg. order value", format: fmtUsd2, spread: fmtUsd2 },
];

function Trend({ change, label, title }: { change: number | null; label: string; title?: string }) {
  if (change === null) return null;
  const up = change > 0;
  const flat = Math.abs(change) < 0.0005;
  const tone = flat ? "text-ink-2" : up ? "text-good" : "text-bad";
  return (
    <span className={`whitespace-nowrap text-xs font-medium ${tone}`} title={title}>
      <span aria-hidden>{flat ? "■" : up ? "▲" : "▼"}</span>{" "}
      <span className="sr-only">{flat ? "Flat" : up ? "Up" : "Down"}</span>
      {fmtDelta(change)} <span className="font-normal text-muted">{label}</span>
    </span>
  );
}

/**
 * Month-over-month change, unless it would repeat the "vs prior" figure
 * (when the selected range is itself one whole month).
 */
export function momChange(data: KpiResponse, key: keyof KpiValues): number | null {
  const { mom, previous, current } = data;
  if (!mom) return null;
  const duplicate = previous && previous[key] === mom.previous[key] && current[key] === mom.current[key];
  return duplicate ? null : pctChange(mom.current[key], mom.previous[key]);
}

export function KpiStrip() {
  const { data, error, isPending, isPlaceholderData } = useKpis();
  const t = useChartTheme();

  const options = useMemo(
    () =>
      data
        ? Object.fromEntries(KPIS.map((k) => [k.key, sparklineOption(data.daily, k.key, t, k.format, data.stats[k.key])]))
        : {},
    [data, t],
  );

  if (error) return <ErrorNote error={error} />;

  return (
    <div className="@container">
      <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @5xl:grid-cols-6">
        {KPIS.map((k) => {
          const stats = data?.stats[k.key];
          const prior = data ? pctChange(data.current[k.key], data.previous?.[k.key]) : null;
          const mom = data ? momChange(data, k.key) : null;
          return (
            <Card key={k.key} busy={isPlaceholderData} className="flex flex-col gap-1 !p-3.5">
              <span className="text-xs font-medium text-ink-2">{k.label}</span>
              {isPending || !data ? (
                <Skeleton height={92} />
              ) : (
                <>
                  <span className="text-2xl font-semibold tracking-tight text-ink" title={k.format(data.current[k.key])}>
                    {k.key === "users" || k.key === "sessions" ? fmtCompact(data.current[k.key]) : k.format(data.current[k.key])}
                  </span>
                  <div className="flex min-h-[1rem] flex-wrap gap-x-2 gap-y-0.5">
                    <Trend change={prior} label="vs prior" title={`vs ${fmtDateRange(data.previous_start, data.previous_end)}`} />
                    <Trend change={mom} label="MoM" title={data.mom?.label} />
                    {prior === null && mom === null && <span className="text-xs text-muted">No prior period</span>}
                  </div>
                  <Chart option={options[k.key]} height={36} label={`Daily ${k.label.toLowerCase()} trend`} className="mt-1" />
                  {stats && stats.days > 1 && (
                    <p
                      className="tabular text-caption text-muted"
                      title={`Daily mean ${k.format(stats.mean)}; standard deviation over ${stats.days} days; coefficient of variation = σ ÷ mean`}
                    >
                      σ ±{k.spread(stats.std)}/day · CV {fmtPct(stats.cv, 0)}
                    </p>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>
      {data?.yoy_note && <p className="mt-2 text-caption text-muted">{data.yoy_note} The shaded band on each sparkline is the daily mean ± 1σ.</p>}
    </div>
  );
}
