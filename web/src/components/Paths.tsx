import { useId, useMemo, useState } from "react";
import { SANKEY_LAYOUT, sankeyMaxStep, sankeyOption } from "../charts/options";
import { fmtInt, fmtPct, fmtUsd } from "../format";
import { useSankey } from "../queries";
import { channelColor, useChartTheme } from "../theme";
import { Card, ErrorNote, Section, Skeleton, TableToggle } from "./Card";
import { Chart } from "./Chart";

const HEIGHT = 420;

export function Paths() {
  const [top, setTop] = useState(20);
  const [committedTop, setCommittedTop] = useState(20);
  const [showTable, setShowTable] = useState(false);
  const { data, error, isPending, isPlaceholderData } = useSankey(committedTop);
  const t = useChartTheme();
  const sliderId = useId();

  const option = useMemo(() => (data && data.links.length ? sankeyOption(data, t) : null), [data, t]);
  const maxStep = data ? sankeyMaxStep(data) : 0;
  const shown = data?.paths.reduce((s, p) => s + p.conversions, 0) ?? 0;

  const commit = () => setCommittedTop(top);

  return (
    <Section
      id="paths"
      title="Conversion paths"
      subtitle="The most common journeys ending in a purchase, cut to their last four touchpoints (30-day lookback)."
      actions={
        <>
          <div className="flex items-center gap-2">
            <label htmlFor={sliderId} className="text-xs text-ink-2">
              Top paths
            </label>
            <input
              id={sliderId}
              type="range"
              min={10}
              max={50}
              step={5}
              value={top}
              onChange={(e) => setTop(Number(e.target.value))}
              onPointerUp={commit}
              onKeyUp={commit}
              onBlur={commit}
              className="w-32"
            />
            <output htmlFor={sliderId} className="tabular w-6 text-right text-xs font-medium text-ink">
              {top}
            </output>
          </div>
          <TableToggle showTable={showTable} onToggle={() => setShowTable((s) => !s)} />
        </>
      }
    >
      <Card busy={isPlaceholderData}>
        {error ? (
          <ErrorNote error={error} />
        ) : isPending || !data ? (
          <Skeleton height={HEIGHT} />
        ) : !option ? (
          <p className="py-16 text-center text-sm text-ink-2">No conversions match these filters.</p>
        ) : showTable ? (
          <div className="overflow-x-auto">
            <table className="tabular w-full min-w-[560px] text-sm">
              <caption className="sr-only">Top converting paths</caption>
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-muted">
                  <th scope="col" className="py-2 pr-2 font-medium">#</th>
                  <th scope="col" className="py-2 font-medium">Path</th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">Conversions</th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">Share</th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.paths.map((p, i) => (
                  <tr key={p.path} className="border-b border-hairline last:border-0">
                    <td className="py-2 pr-2 text-muted">{i + 1}</td>
                    <td className="py-2 text-ink">
                      {p.path.split(" > ").map((ch, j) => (
                        <span key={j} className="whitespace-nowrap">
                          {j > 0 && <span className="mx-1 text-muted">→</span>}
                          <span
                            aria-hidden
                            className="mr-1 inline-block h-2 w-2 rounded-sm align-middle"
                            style={{ background: channelColor(ch, t.mode) }}
                          />
                          {ch}
                        </span>
                      ))}
                    </td>
                    <td className="py-2 pl-3 text-right text-ink-2">{fmtInt(p.conversions)}</td>
                    <td className="py-2 pl-3 text-right text-ink-2">{fmtPct(p.share)}</td>
                    <td className="py-2 pl-3 text-right text-ink-2">{fmtUsd(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {/* Column headers aligned to the Sankey's node columns. */}
            <div className="relative mb-1 h-4 text-[11px] text-muted" aria-hidden>
              {Array.from({ length: maxStep + 1 }, (_, i) => (
                <span
                  key={i}
                  className="absolute top-0 whitespace-nowrap"
                  style={{
                    left: `calc(${SANKEY_LAYOUT.left}px + (100% - ${SANKEY_LAYOUT.left + SANKEY_LAYOUT.right + SANKEY_LAYOUT.nodeWidth}px) * ${i / maxStep})`,
                  }}
                >
                  {i === maxStep ? "Purchase" : `Step ${i + 1}`}
                </span>
              ))}
            </div>
            <Chart option={option} height={HEIGHT} label="Sankey diagram of the top converting customer journeys" />
          </>
        )}
        {data && data.total_conversions > 0 && (
          <p className="mt-3 border-t border-hairline pt-3 text-xs text-ink-2">
            Showing the top {data.paths.length} paths, covering {fmtInt(shown)} of {fmtInt(data.total_conversions)} conversions (
            {fmtPct(shown / data.total_conversions)}). Hover a flow for its count and share; journeys longer than four touches keep
            their last four.
          </p>
        )}
      </Card>
    </Section>
  );
}
