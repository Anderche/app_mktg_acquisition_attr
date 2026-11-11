import { bestCampaignInsight, markovGainInsight, topJourneyInsight, type Insight } from "../insights";
import { useAttribution, useCampaigns, useSankey } from "../queries";
import { sectionHref } from "../sections";
import { ChipLink } from "./Chip";
import { APP_NAME, GitHubIcon, REPO_URL } from "./Credit";

// Shares the Sankey section's default query (top 20), so this costs no extra request.
const SANKEY_TOP = 20;

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
    <ul aria-label="Highlights" className="mt-4 flex flex-wrap gap-2">
      {insights.map((i) => (
        <li key={i.id} className="min-w-0 max-w-full">
          <ChipLink href={sectionHref(i.section)} className="max-w-full" icon={<span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}>
            <span className="truncate">{i.text}</span>
            <span aria-hidden className="text-muted">
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
      <div className="rounded-card border border-border bg-surface p-5 shadow-card md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 id="intro-title" className="font-display text-display font-semibold text-ink">
              Which channels really earn the sale?
            </h2>
            <p className="mt-2 text-body text-ink-2">
              {APP_NAME} follows every customer journey to purchase and compares how last-click, first-click, linear and Markov
              attribution split the credit, so you can see which channels the usual last-click report undervalues.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
        </div>
        <InsightChips />
      </div>
    </section>
  );
}
