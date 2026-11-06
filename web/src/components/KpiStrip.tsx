import { useMemo } from "react";
import type { KpiValues } from "../api";
import { sparklineOption } from "../charts/options";
import { fmtCompact, fmtDateRange, fmtDelta, fmtInt, fmtPct, fmtUsd, fmtUsd2, pctChange } from "../format";
import { useKpis } from "../queries";
import { useChartTheme } from "../theme";
import { Card, ErrorNote, Skeleton } from "./Card";
import { Chart } from "./Chart";

interface KpiDef {
  key: keyof KpiValues;
  label: string;
  format: (n: number) => string;
  sparkFormat: (n: number) => string;
}

const KPIS: KpiDef[] = [
  { key: "users", label: "Users", format: fmtInt, sparkFormat: fmtInt },
  { key: "sessions", label: "Sessions", format: fmtInt, sparkFormat: fmtInt },
  { key: "conversions", label: "Conversions", format: fmtInt, sparkFormat: fmtInt },
  { key: "revenue", label: "Revenue", format: fmtUsd, sparkFormat: fmtUsd },
  { key: "conversion_rate", label: "Conversion rate", format: (n) => fmtPct(n, 2), sparkFormat: (n) => fmtPct(n, 2) },
  { key: "aov", label: "Avg. order value", format: fmtUsd2, sparkFormat: fmtUsd2 },
];

function Delta({ change, previousLabel }: { change: number | null; previousLabel: string }) {
  if (change === null) {
    return (
      <span className="text-xs text-muted" title="The previous period falls before the data starts">
        No prior period
      </span>
    );
  }
  const up = change > 0;
  const flat = Math.abs(change) < 0.0005;
  const tone = flat ? "text-ink-2" : up ? "text-good" : "text-bad";
  return (
    <span className={`text-xs font-medium ${tone}`} title={`vs ${previousLabel}`}>
      <span aria-hidden>{flat ? "■" : up ? "▲" : "▼"}</span>{" "}
      <span className="sr-only">{flat ? "Flat" : up ? "Up" : "Down"}</span>
      {fmtDelta(change)} <span className="font-normal text-muted">vs prior</span>
    </span>
  );
}

export function KpiStrip() {
  const { data, error, isPending, isPlaceholderData } = useKpis();
  const t = useChartTheme();

  const options = useMemo(
    () => (data ? Object.fromEntries(KPIS.map((k) => [k.key, sparklineOption(data.daily, k.key, t, k.sparkFormat)])) : {}),
    [data, t],
  );

  if (error) return <ErrorNote error={error} />;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KPIS.map((k) => (
        <Card key={k.key} busy={isPlaceholderData} className="flex flex-col gap-1 !p-3.5">
          <span className="text-xs font-medium text-ink-2">{k.label}</span>
          {isPending || !data ? (
            <Skeleton height={68} />
          ) : (
            <>
              <span className="text-2xl font-semibold tracking-tight text-ink" title={k.format(data.current[k.key])}>
                {k.key === "users" || k.key === "sessions" ? fmtCompact(data.current[k.key]) : k.format(data.current[k.key])}
              </span>
              <Delta
                change={pctChange(data.current[k.key], data.previous?.[k.key])}
                previousLabel={fmtDateRange(data.previous_start, data.previous_end)}
              />
              <Chart option={options[k.key]} height={36} label={`Daily ${k.label.toLowerCase()} trend`} className="mt-1" />
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
