import { useMemo, useState } from "react";
import type { ChannelRow } from "../api";
import { channelRevenueOption } from "../charts/options";
import { fmtInt, fmtPct, fmtUsd } from "../format";
import { useChannels } from "../queries";
import { channelColor, useChartTheme } from "../theme";
import { Card, CardTitle, ChannelDot, ErrorNote, Section, Skeleton } from "./Card";
import { Chart } from "./Chart";
import { SortHeader, useSort } from "./sort";

type Col = keyof Omit<ChannelRow, "channel"> | "channel";

const COLUMNS: { key: Col; label: string; format: (r: ChannelRow) => string; numeric: boolean }[] = [
  { key: "channel", label: "Channel", format: (r) => r.channel, numeric: false },
  { key: "users", label: "Users", format: (r) => fmtInt(r.users), numeric: true },
  { key: "sessions", label: "Sessions", format: (r) => fmtInt(r.sessions), numeric: true },
  { key: "conversion_rate", label: "CVR", format: (r) => fmtPct(r.conversion_rate, 2), numeric: true },
  { key: "revenue", label: "Revenue", format: (r) => fmtUsd(r.revenue), numeric: true },
  { key: "revenue_share", label: "% share", format: (r) => fmtPct(r.revenue_share), numeric: true },
];

export function ChannelPerformance() {
  const { data, error, isPending, isPlaceholderData } = useChannels();
  const t = useChartTheme();
  const [sort, setSort] = useState<{ key: Col; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });
  const rows = useSort(data ?? [], sort);
  const option = useMemo(() => (data ? channelRevenueOption(data, t) : null), [data, t]);

  return (
    <Section id="channels" title="Channel performance" subtitle="Each session's source/medium mapped to a default channel group. Follows the filters above.">
      {error ? (
        <ErrorNote error={error} />
      ) : (
        <div className="grid grid-cols-12 gap-3">
          <Card busy={isPlaceholderData} className="col-span-12 lg:col-span-7">
            <CardTitle hint="Session revenue">Revenue by channel</CardTitle>
            {isPending || !option ? <Skeleton height={280} /> : <Chart option={option} height={280} label="Horizontal bar chart of revenue by channel" />}
          </Card>
          <Card busy={isPlaceholderData} className="col-span-12 overflow-x-auto lg:col-span-5">
            <CardTitle>Channel table</CardTitle>
            {isPending ? (
              <Skeleton height={280} />
            ) : (
              <table className="tabular w-full min-w-[440px] text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-xs text-muted">
                    {COLUMNS.map((c) => (
                      <SortHeader key={c.key} col={c.key} label={c.label} numeric={c.numeric} sort={sort} onSort={setSort} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.channel} className="border-b border-hairline last:border-0">
                      {COLUMNS.map((c) => (
                        <td key={c.key} className={`py-2 ${c.numeric ? "pl-3 text-right text-ink-2" : "pr-2 text-ink"}`}>
                          {c.key === "channel" && <ChannelDot color={channelColor(r.channel, t.mode)} />}
                          {c.format(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </Section>
  );
}
