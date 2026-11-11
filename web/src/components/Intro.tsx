import { useMemo } from "react";
import { sankeyOption, topPathsSankey } from "../charts/options";
import { fmtInt, fmtPct } from "../format";
import { bestCampaignInsight, markovGainInsight, topJourneyInsight, type Insight } from "../insights";
import { useAttribution, useCampaigns, useSankey } from "../queries";
import { hueFor, sectionHref } from "../sections";
import { useChartTheme } from "../theme";
import { useChartHeight } from "../useMediaQuery";
import { Skeleton } from "./Card";
import { Chart } from "./Chart";
import { ChipLink, HueDot } from "./Chip";
import { GitHubIcon, REPO_URL } from "./Credit";

// Shares the Journeys section's default query (top 20), so the hero costs no
// extra request; the preview keeps the 8 biggest journeys.
const SANKEY_TOP = 20;
const PREVIEW_PATHS = 8;

function SankeyPreview() {
  const { data, error } = useSankey(SANKEY_TOP);
  const t = useChartTheme();
  const height = useChartHeight(220, 260);
  const preview = useMemo(() => (data ? topPathsSankey(data, PREVIEW_PATHS) : null), [data]);
  const option = useMemo(() => (preview?.links.length ? sankeyOption(preview, t, { compact: true }) : null), [preview, t]);
  const covered = preview?.paths.reduce((s, p) => s + p.conversions, 0) ?? 0;

  return (
    <figure aria-labelledby="hero-sankey-title" className="min-w-0 rounded-xl border border-border bg-page p-3 md:p-4">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span id="hero-sankey-title" className="text-sm font-medium text-ink">
          Top journeys to purchase
        </span>
        <a href={sectionHref("paths")} className="whitespace-nowrap text-xs font-medium text-accent hover:underline">
          Explore all journeys <span aria-hidden>→</span>
        </a>
      </figcaption>
      {error ? (
        <p className="py-10 text-center text-sm text-ink-2">Journeys are unavailable right now.</p>
      ) : !option ? (
        <Skeleton height={height} />
      ) : (
        <Chart option={option} height={height} label="Sankey preview of the eight most common journeys ending in a purchase" />
      )}
      {preview && data && data.total_conversions > 0 && (
        <p className="mt-1 text-caption text-muted">
          {preview.paths.length} journeys · {fmtInt(covered)} of {fmtInt(data.total_conversions)} conversions (
          {fmtPct(covered / data.total_conversions)})
        </p>
      )}
    </figure>
  );
}

function InsightChips() {
  const attribution = useAttribution();
  const sankey = useSankey(SANKEY_TOP);
  const campaigns = useCampaigns();

  const insights = [
    markovGainInsight(attribution.data?.conversions),
    topJourneyInsight(sankey.data?.paths),
    bestCampaignInsight(campaigns.data),
  ].filter((i): i is Insight => i !== null);

  if (!insights.length) return null;
  return (
    <ul aria-label="Highlights" className="flex flex-wrap gap-2">
      {insights.map((i) => (
        <li key={i.id} className="min-w-0 max-w-full">
          <ChipLink href={sectionHref(i.section)} hue={hueFor(i.section)} tint className="max-w-full" icon={<HueDot hue={hueFor(i.section)} />}>
            <span className="truncate">{i.text}</span>
            <span aria-hidden className="text-ink-2">
              →
            </span>
          </ChipLink>
        </li>
      ))}
    </ul>
  );
}

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="col-span-12 min-w-0">
      {/* Phones: headline, preview, copy. Desktop: copy left, preview right. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-4 rounded-card border border-border bg-surface p-4 shadow-card md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <h2 id="intro-title" className="font-display text-[1.625rem] font-semibold leading-tight tracking-tight text-ink md:text-display lg:col-start-1 lg:row-start-1 lg:self-end">
          Which channels really earn the sale?
        </h2>
        <div className="lg:col-start-2 lg:row-span-4 lg:row-start-1">
          <SankeyPreview />
        </div>
        <p className="text-body text-ink-2 lg:col-start-1 lg:row-start-2">
          Follow every customer journey to purchase, then compare four attribution models to see which channels last-click
          undervalues.
        </p>
        <div className="flex flex-wrap items-center gap-2 lg:col-start-1 lg:row-start-3">
          <a
            href={sectionHref("attribution")}
            className="inline-flex h-10 items-center rounded-lg bg-[var(--cta-bg)] px-4 text-sm font-semibold text-[var(--cta-text)] hover:opacity-90"
          >
            See what last-click misses <span aria-hidden className="ml-1.5">→</span>
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <GitHubIcon />
            View source
          </a>
        </div>
        <div className="lg:col-start-1 lg:row-start-4 lg:self-start">
          <InsightChips />
        </div>
      </div>
    </section>
  );
}
