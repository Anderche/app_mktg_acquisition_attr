// Typed client for the FastAPI backend. Shapes mirror api/schemas.py.

export interface Filters {
  start: string;
  end: string;
  device: string;
  country: string;
}

export interface KpiValues {
  users: number;
  sessions: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
  aov: number;
}

export interface DailyPoint extends KpiValues {
  date: string;
}

export interface MetricStats {
  mean: number;
  std: number;
  cv: number;
  days: number;
}

export interface PeriodComparison {
  label: string;
  current: KpiValues;
  previous: KpiValues;
}

export interface KpiResponse {
  current: KpiValues;
  previous: KpiValues | null;
  previous_start: string;
  previous_end: string;
  daily: DailyPoint[];
  stats: Record<keyof KpiValues, MetricStats>;
  mom: PeriodComparison | null;
  yoy: PeriodComparison | null;
  yoy_note: string | null;
}

export interface ChannelRow {
  channel: string;
  users: number;
  sessions: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
  revenue_share: number;
}

export const MODELS = ["last_click", "first_click", "linear", "markov"] as const;
export type Model = (typeof MODELS)[number];

export type AttributionRow = { channel: string; model_std: number; model_cv: number } & Record<Model, number>;

export interface AttributionResponse {
  conversions: AttributionRow[];
  revenue: AttributionRow[];
}

export interface RemovalEffectRow {
  channel: string;
  removal_effect: number;
  share: number;
}

export interface SankeyNode {
  name: string;
  channel: string;
  step: number | null;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  share: number;
}

export interface SankeyPath {
  path: string;
  conversions: number;
  share: number;
  revenue: number;
}

export interface SankeyResponse {
  nodes: SankeyNode[];
  links: SankeyLink[];
  paths: SankeyPath[];
  total_conversions: number;
}

export interface CampaignRow {
  campaign: string;
  source_medium: string;
  channel: string;
  sessions: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  revenue_per_session: number;
}

export interface MetaResponse {
  source: "synthetic" | "bigquery";
  dataset: string;
  generated_at: string;
  start_date: string;
  end_date: string;
  lookback_days: number;
  stats: Record<string, number>;
  limitations: string[];
  devices: string[];
  countries: string[];
  channels: string[];
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function toQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === "all") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const res = await fetch(`${BASE}${path}${toQuery(params)}`);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // keep statusText
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

export const api = {
  meta: () => get<MetaResponse>("/api/meta"),
  kpis: (f: Filters) => get<KpiResponse>("/api/kpis", { ...f }),
  channels: (f: Filters) => get<ChannelRow[]>("/api/channels", { ...f }),
  attribution: () => get<AttributionResponse>("/api/attribution"),
  removalEffects: () => get<RemovalEffectRow[]>("/api/removal-effects"),
  sankey: (f: Filters, top: number, steps = 4) =>
    get<SankeyResponse>("/api/sankey", { ...f, top, steps }),
  campaigns: (f: Filters, limit = 200) =>
    get<CampaignRow[]>("/api/campaigns", { ...f, sort: "revenue", limit }),
};
