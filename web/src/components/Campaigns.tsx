import { useId, useMemo, useState } from "react";
import type { CampaignRow } from "../api";
import { fmtInt, fmtPct, fmtUsd, fmtUsd2 } from "../format";
import { useCampaigns } from "../queries";
import { channelColor, useChartTheme } from "../theme";
import { Card, ChannelDot, ErrorNote, Section, Skeleton } from "./Card";
import { SortHeader, useSort, type SortState } from "./sort";

type Col = keyof CampaignRow;

const COLUMNS: { key: Col; label: string; numeric: boolean; format: (r: CampaignRow) => string }[] = [
  { key: "campaign", label: "Campaign", numeric: false, format: (r) => r.campaign },
  { key: "source_medium", label: "Source / medium", numeric: false, format: (r) => r.source_medium },
  { key: "sessions", label: "Sessions", numeric: true, format: (r) => fmtInt(r.sessions) },
  { key: "conversions", label: "Conv.", numeric: true, format: (r) => fmtInt(r.conversions) },
  { key: "conversion_rate", label: "CVR", numeric: true, format: (r) => fmtPct(r.conversion_rate, 2) },
  { key: "revenue", label: "Revenue", numeric: true, format: (r) => fmtUsd(r.revenue) },
  { key: "revenue_per_session", label: "Rev / session", numeric: true, format: (r) => fmtUsd2(r.revenue_per_session) },
];

// Rows with fewer sessions than this get no good/bad formatting: their rates are noise.
export const MIN_SESSIONS_FOR_FORMATTING = 100;

export type Tone = "good" | "bad" | null;

/** Above / below the blended rate by more than 20% counts as a signal. */
export function toneFor(value: number, benchmark: number, sessions: number): Tone {
  if (sessions < MIN_SESSIONS_FOR_FORMATTING || benchmark <= 0) return null;
  if (value >= benchmark * 1.2) return "good";
  if (value <= benchmark * 0.8) return "bad";
  return null;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function campaignsCsv(rows: CampaignRow[]): string {
  const header = ["campaign", "source_medium", "channel", "sessions", "conversions", "conversion_rate", "revenue", "revenue_per_session"];
  const lines = rows.map((r) =>
    [
      r.campaign,
      r.source_medium,
      r.channel,
      r.sessions,
      r.conversions,
      r.conversion_rate.toFixed(5),
      r.revenue.toFixed(2),
      r.revenue_per_session.toFixed(4),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function filterCampaigns(rows: CampaignRow[], query: string): CampaignRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => `${r.campaign} ${r.source_medium} ${r.channel}`.toLowerCase().includes(q));
}

export function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  const t = useChartTheme();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState<Col>>({ key: "revenue", dir: "desc" });

  const benchmark = useMemo(() => {
    const s = rows.reduce((a, r) => a + r.sessions, 0);
    const c = rows.reduce((a, r) => a + r.conversions, 0);
    const rev = rows.reduce((a, r) => a + r.revenue, 0);
    return { cvr: s ? c / s : 0, rps: s ? rev / s : 0 };
  }, [rows]);

  const filtered = useMemo(() => filterCampaigns(rows, query), [rows, query]);
  const sorted = useSort(filtered, sort);

  const cellTone = (r: CampaignRow, key: Col): Tone =>
    key === "conversion_rate"
      ? toneFor(r.conversion_rate, benchmark.cvr, r.sessions)
      : key === "revenue_per_session"
        ? toneFor(r.revenue_per_session, benchmark.rps, r.sessions)
        : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor={searchId} className="sr-only">
            Search campaigns
          </label>
          <input
            id={searchId}
            type="search"
            placeholder="Search campaign or source…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-64 max-w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink placeholder:text-muted"
          />
          <span className="text-xs text-muted" aria-live="polite">
            {fmtInt(sorted.length)} of {fmtInt(rows.length)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted md:inline">
            <span className="text-good">▲</span> / <span className="text-bad">▼</span> ≥20% above / below the blended rate ({fmtPct(benchmark.cvr, 2)} CVR,{" "}
            {fmtUsd2(benchmark.rps)}/session)
          </span>
          <button
            type="button"
            onClick={() => download("campaigns.csv", campaignsCsv(sorted))}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="tabular w-full min-w-[760px] text-sm">
          <caption className="sr-only">Campaign leaderboard</caption>
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-hairline text-left text-xs text-muted">
              {COLUMNS.map((c) => (
                <SortHeader key={c.key} col={c.key} label={c.label} numeric={c.numeric} sort={sort} onSort={setSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={`${r.campaign}|${r.source_medium}`} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                {COLUMNS.map((c) => {
                  const tone = cellTone(r, c.key);
                  return (
                    <td
                      key={c.key}
                      className={`py-2 ${c.numeric ? "pl-3 text-right" : "pr-3"} ${
                        tone === "good" ? "font-medium text-good" : tone === "bad" ? "font-medium text-bad" : c.numeric ? "text-ink-2" : "text-ink"
                      }`}
                      style={tone ? { background: tone === "good" ? "var(--good-wash)" : "var(--bad-wash)" } : undefined}
                    >
                      {c.key === "campaign" && <ChannelDot color={channelColor(r.channel, t.mode)} />}
                      {tone && (
                        <span aria-hidden className="mr-1 text-[10px]">
                          {tone === "good" ? "▲" : "▼"}
                        </span>
                      )}
                      {tone && <span className="sr-only">{tone === "good" ? "above average" : "below average"}: </span>}
                      {c.format(r)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-8 text-center text-ink-2">
                  No campaigns match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Campaigns() {
  const { data, error, isPending, isPlaceholderData } = useCampaigns();
  return (
    <Section id="campaigns" title="Campaign leaderboard" subtitle="Campaign × source/medium, session-scoped. Follows the filters above.">
      <Card busy={isPlaceholderData}>
        {error ? <ErrorNote error={error} /> : isPending || !data ? <Skeleton height={360} /> : <CampaignTable rows={data} />}
      </Card>
    </Section>
  );
}
