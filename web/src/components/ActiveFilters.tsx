import type { Filters } from "../api";
import { DEFAULT_FILTERS, presetFor, useFilters } from "../filters";
import { fmtDateRange } from "../format";
import { RemovableChip } from "./Chip";

export interface FilterChip {
  key: "date" | "device" | "country";
  label: string;
  reset: Partial<Filters>;
}

/** One chip per filter that differs from its default. */
export function activeFilterChips(f: Filters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.start !== DEFAULT_FILTERS.start || f.end !== DEFAULT_FILTERS.end) {
    chips.push({
      key: "date",
      label: presetFor(f)?.label ?? fmtDateRange(f.start, f.end),
      reset: { start: DEFAULT_FILTERS.start, end: DEFAULT_FILTERS.end },
    });
  }
  if (f.device !== DEFAULT_FILTERS.device) {
    chips.push({ key: "device", label: f.device.charAt(0).toUpperCase() + f.device.slice(1), reset: { device: "all" } });
  }
  if (f.country !== DEFAULT_FILTERS.country) {
    chips.push({ key: "country", label: f.country, reset: { country: "all" } });
  }
  return chips;
}

export function ActiveFilters() {
  const { filters, setFilters, reset } = useFilters();
  const chips = activeFilterChips(filters);
  if (chips.length === 0) return null;

  return (
    <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <RemovableChip key={c.key} label={c.label} onRemove={() => setFilters(c.reset)} />
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={reset} className="h-8 rounded-full px-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
          Clear all
        </button>
      )}
    </div>
  );
}
