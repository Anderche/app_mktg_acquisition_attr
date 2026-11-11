// Copy for the reference tiles at the top of the page. Edit text here; the
// layout lives in components/ReferenceTiles.tsx. Tiles ii and iii describe
// possible uses, not features the app has today, and are worded that way.
import type { SectionId } from "../sections";

export interface ReferencePoint {
  term: string;
  text: string;
}

export interface ReferenceTile {
  id: "source" | "extend" | "audience";
  numeral: string;
  title: string;
  lede: string;
  points: ReferencePoint[];
  link: { section: SectionId; label: string };
}

export const SOURCE_TILE: ReferenceTile = {
  id: "source",
  numeral: "i",
  title: "Source data",
  lede: "Google Merchandise Store, GA4 obfuscated ecommerce sample in BigQuery: event-level data, Nov 2020 – Jan 2021.",
  points: [
    { term: "Not included", text: "ad spend, cross-device identity, and sources Google obfuscated in the public sample." },
  ],
  link: { section: "data-notes", label: "Read the data notes" },
};

export const EXTEND_TILE: ReferenceTile = {
  id: "extend",
  numeral: "ii",
  title: "How it extends to your data",
  lede: "The same pipeline could take other inputs alongside web sessions:",
  points: [
    { term: "Consumer data", text: "join journeys to CRM or CDP customer IDs to see which channels acquire which segments." },
    { term: "Lifetime value", text: "credit repeat-purchase revenue to the first-touch channel, judging channels on LTV, not first order." },
    { term: "Marketing spend", text: "add ad cost by channel and campaign to get ROAS and CAC under each model." },
    { term: "Offline sales", text: "add store visits or call-centre orders as touchpoints or conversions." },
  ],
  link: { section: "paths", label: "See the journeys it builds on" },
};

export const AUDIENCE_TILE: ReferenceTile = {
  id: "audience",
  numeral: "iii",
  title: "Who it helps",
  lede: "Business units and executives that could use it, and how:",
  points: [
    { term: "CMO", text: "shift budget toward channels that start journeys, not only the ones that close them." },
    { term: "CFO", text: "back marketing spend with model-based revenue credit and weigh CAC against LTV." },
    { term: "CEO", text: "see which growth levers actually drive revenue." },
    { term: "E-commerce & growth", text: "campaign and journey diagnostics for weekly decisions." },
    { term: "Data & analytics", text: "a reusable, tested attribution pipeline." },
  ],
  link: { section: "channels", label: "Start with channel performance" },
};

export const REFERENCE_TILES = [SOURCE_TILE, EXTEND_TILE, AUDIENCE_TILE];
