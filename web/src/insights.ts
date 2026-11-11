// Pure builders for the intro's insight chips. Each returns null when the data
// doesn't support a claim, and the chip is then left out.
import type { AttributionRow, CampaignRow, SankeyPath } from "./api";
import { MIN_SESSIONS_FOR_FORMATTING } from "./components/Campaigns";
import { fmtInt, fmtPct } from "./format";
import type { SectionId } from "./sections";

export interface Insight {
  id: string;
  text: string;
  section: SectionId;
}

/** Channel with the largest gain from last-click to Markov conversions. */
export function markovGainInsight(rows: AttributionRow[] | undefined): Insight | null {
  if (!rows?.length) return null;
  const best = rows.reduce((a, b) => (b.markov - b.last_click > a.markov - a.last_click ? b : a));
  if (best.markov - best.last_click < 0.5) return null;
  return {
    id: "markov-gain",
    text: `${best.channel} gains most under Markov: ${fmtInt(best.last_click)} → ${fmtInt(best.markov)}`,
    section: "attribution",
  };
}

/** The most common converting journey. */
export function topJourneyInsight(paths: SankeyPath[] | undefined): Insight | null {
  const top = paths?.[0];
  if (!top) return null;
  return {
    id: "top-journey",
    text: `Top journey: ${top.path.split(" > ").join(" → ")} → Purchase (${fmtPct(top.share)})`,
    section: "paths",
  };
}

// GA4 placeholders such as "(referral)", "(not set)" or "<Other>" aren't campaigns.
const PLACEHOLDER_CAMPAIGN = /^[(<].*[)>]$/;

/**
 * Highest conversion rate among real campaigns with enough sessions to trust
 * it, shown only when it beats the blended rate (otherwise "best" misleads).
 */
export function bestCampaignInsight(rows: CampaignRow[] | undefined): Insight | null {
  const all = rows ?? [];
  const sessions = all.reduce((s, r) => s + r.sessions, 0);
  const blended = sessions ? all.reduce((s, r) => s + r.conversions, 0) / sessions : 0;
  const eligible = all.filter(
    (r) => !PLACEHOLDER_CAMPAIGN.test(r.campaign.trim()) && r.sessions >= MIN_SESSIONS_FOR_FORMATTING && r.conversions > 0,
  );
  if (!eligible.length) return null;
  const best = eligible.reduce((a, b) => (b.conversion_rate > a.conversion_rate ? b : a));
  if (best.conversion_rate <= blended) return null;
  return {
    id: "best-campaign",
    text: `Best campaign CVR: ${best.campaign} (${fmtPct(best.conversion_rate, 2)})`,
    section: "campaigns",
  };
}
