const nf = new Intl.NumberFormat("en-US");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (n: number) => nf.format(Math.round(n));
export const fmtUsd = (n: number) => usd.format(n);
export const fmtUsd2 = (n: number) => usd2.format(n);
export const fmtUsdCompact = (n: number) => compactUsd.format(n);
export const fmtCompact = (n: number) => compact.format(n);
export const fmtPct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

/** Relative change, or null when there is no baseline to compare against. */
export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return (current - previous) / previous;
}

export function fmtDelta(change: number | null): string {
  if (change === null) return "—";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${sign}${Math.abs(change * 100).toFixed(1)}%`;
}

export function fmtDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const f = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-US", opts);
  return `${f(start)} – ${f(end)}`;
}
