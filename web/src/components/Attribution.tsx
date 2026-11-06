import { useMemo, useState } from "react";
import { MODELS } from "../api";
import { attributionOption, removalEffectsOption, type AttributionMetric } from "../charts/options";
import { fmtInt, fmtPct, fmtUsd } from "../format";
import { useAttribution, useRemovalEffects } from "../queries";
import { channelColor, MODEL_LABELS, useChartTheme } from "../theme";
import { Card, CardTitle, ChannelDot, ErrorNote, Section, Segmented, Skeleton, TableToggle } from "./Card";
import { Chart } from "./Chart";

export function Attribution() {
  const attribution = useAttribution();
  const removal = useRemovalEffects();
  const t = useChartTheme();
  const [metric, setMetric] = useState<AttributionMetric>("conversions");
  const [showTable, setShowTable] = useState(false);

  const rows = attribution.data?.[metric];
  const option = useMemo(() => (rows ? attributionOption(rows, metric, t) : null), [rows, metric, t]);
  const removalOption = useMemo(() => (removal.data ? removalEffectsOption(removal.data, t) : null), [removal.data, t]);
  const fmt = metric === "revenue" ? fmtUsd : fmtInt;

  // The channel with the largest gain from last click to Markov.
  const biggestGain = useMemo(() => {
    if (!rows?.length) return null;
    return rows.reduce((best, r) => (r.markov - r.last_click > best.markov - best.last_click ? r : best));
  }, [rows]);

  return (
    <Section
      id="attribution"
      title="Attribution comparison"
      subtitle="Credit each channel receives for the same conversions under four models. Fitted on the full period; filters do not apply."
      actions={
        <>
          <Segmented
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "conversions", label: "Conversions" },
              { value: "revenue", label: "Revenue" },
            ]}
          />
          <TableToggle showTable={showTable} onToggle={() => setShowTable((s) => !s)} />
        </>
      }
    >
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-12 lg:col-span-8">
          <CardTitle hint={`Attributed ${metric}`}>Credit by model</CardTitle>
          {attribution.error ? (
            <ErrorNote error={attribution.error} />
          ) : !rows || !option ? (
            <Skeleton height={300} />
          ) : showTable ? (
            <div className="overflow-x-auto">
              <table className="tabular w-full min-w-[520px] text-sm">
                <caption className="sr-only">Attributed {metric} by channel and model</caption>
                <thead>
                  <tr className="border-b border-hairline text-left text-xs text-muted">
                    <th scope="col" className="py-2 font-medium">Channel</th>
                    {MODELS.map((m) => (
                      <th key={m} scope="col" className="py-2 pl-3 text-right font-medium">
                        {MODEL_LABELS[m]}
                      </th>
                    ))}
                    <th scope="col" className="py-2 pl-3 text-right font-medium">Markov vs last click</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const shift = r.last_click ? (r.markov - r.last_click) / r.last_click : 0;
                    return (
                      <tr key={r.channel} className="border-b border-hairline last:border-0">
                        <td className="py-2 text-ink">
                          <ChannelDot color={channelColor(r.channel, t.mode)} />
                          {r.channel}
                        </td>
                        {MODELS.map((m) => (
                          <td key={m} className="py-2 pl-3 text-right text-ink-2">
                            {fmt(r[m])}
                          </td>
                        ))}
                        <td className={`py-2 pl-3 text-right font-medium ${shift >= 0 ? "text-good" : "text-bad"}`}>
                          {shift >= 0 ? "▲ +" : "▼ −"}
                          {Math.abs(shift * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Chart option={option} height={300} label={`Grouped bar chart of attributed ${metric} by channel for four attribution models`} />
          )}
          <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-2">
            Channels gaining credit under Markov are undervalued by last-click.
            {biggestGain && biggestGain.markov > biggestGain.last_click && (
              <>
                {" "}
                Here, <b className="text-ink">{biggestGain.channel}</b> gains the most: {fmt(biggestGain.last_click)} →{" "}
                {fmt(biggestGain.markov)}.
              </>
            )}
          </p>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardTitle hint="Share of total">Markov removal effects</CardTitle>
          {removal.error ? (
            <ErrorNote error={removal.error} />
          ) : !removalOption ? (
            <Skeleton height={240} />
          ) : (
            <Chart option={removalOption} height={240} label="Bar chart of Markov removal effect share by channel" />
          )}
          <p className="mt-3 border-t border-hairline pt-3 text-xs text-ink-2">
            Removal effect: the share of conversions lost if a channel were taken out of every journey.
            {removal.data && removal.data[0] && (
              <> Largest: {removal.data[0].channel} ({fmtPct(removal.data[0].removal_effect)} of conversions).</>
            )}
          </p>
        </Card>
      </div>
    </Section>
  );
}
