import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Filters } from "./api";

// Coverage of the GA4 sample; the API reports the same bounds in /api/meta.
export const COVERAGE = { start: "2020-11-01", end: "2021-01-31" } as const;

export const DEFAULT_FILTERS: Filters = {
  start: COVERAGE.start,
  end: COVERAGE.end,
  device: "all",
  country: "all",
};

export interface DatePreset {
  id: string;
  label: string;
  start: string;
  end: string;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "all", label: "Full period", start: COVERAGE.start, end: COVERAGE.end },
  { id: "nov", label: "Nov 2020", start: "2020-11-01", end: "2020-11-30" },
  { id: "dec", label: "Dec 2020", start: "2020-12-01", end: "2020-12-31" },
  { id: "jan", label: "Jan 2021", start: "2021-01-01", end: "2021-01-31" },
  { id: "bfcm", label: "Black Friday – Cyber Monday", start: "2020-11-27", end: "2020-11-30" },
  { id: "last30", label: "Last 30 days", start: "2021-01-02", end: "2021-01-31" },
];

export function presetFor(f: Pick<Filters, "start" | "end">): DatePreset | undefined {
  return DATE_PRESETS.find((p) => p.start === f.start && p.end === f.end);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse filters from a query string, falling back to defaults for bad values. */
export function filtersFromSearch(search: string): Filters {
  const qs = new URLSearchParams(search);
  const date = (key: "start" | "end") => {
    const v = qs.get(key);
    return v && DATE_RE.test(v) ? v : DEFAULT_FILTERS[key];
  };
  let start = date("start");
  let end = date("end");
  if (start > end) [start, end] = [DEFAULT_FILTERS.start, DEFAULT_FILTERS.end];
  return {
    start,
    end,
    device: qs.get("device") || "all",
    country: qs.get("country") || "all",
  };
}

export function filtersToSearch(f: Filters): string {
  const qs = new URLSearchParams();
  if (f.start !== DEFAULT_FILTERS.start) qs.set("start", f.start);
  if (f.end !== DEFAULT_FILTERS.end) qs.set("end", f.end);
  if (f.device !== "all") qs.set("device", f.device);
  if (f.country !== "all") qs.set("country", f.country);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

interface FiltersContextValue {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  reset: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setState] = useState<Filters>(() => filtersFromSearch(window.location.search));

  // Keep the URL shareable: the current slice lives in the query string.
  useEffect(() => {
    const next = `${window.location.pathname}${filtersToSearch(filters)}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, [filters]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);
  const reset = useCallback(() => setState(DEFAULT_FILTERS), []);

  const value = useMemo(() => ({ filters, setFilters, reset }), [filters, setFilters, reset]);
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}
