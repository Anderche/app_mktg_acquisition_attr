import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { COVERAGE, DATE_PRESETS, presetFor, useFilters } from "../filters";
import { useMeta } from "../queries";
import type { Mode } from "../theme";
import { ActiveFilters } from "./ActiveFilters";
import { APP_NAME, AuthorCredit } from "./Credit";
import { SectionNav, useActiveSection } from "./SectionNav";

const controlCls =
  "h-9 rounded-lg border border-border bg-surface px-2.5 text-sm text-ink hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

interface HeaderProps {
  mode: Mode;
  onModeChange: (m: Mode) => void;
}

export function Header({ mode, onModeChange }: HeaderProps) {
  const { filters, setFilters } = useFilters();
  const meta = useMeta();
  const ids = { preset: useId(), start: useId(), end: useId(), device: useId(), country: useId() };
  const preset = presetFor(filters);
  const active = useActiveSection();
  const ref = useHeaderHeightVar();

  const minDate = meta.data?.start_date ?? COVERAGE.start;
  const maxDate = meta.data?.end_date ?? COVERAGE.end;

  return (
    <header ref={ref} className="header-glass top-0 z-20 border-b border-hairline md:sticky">
      <div className="mx-auto max-w-[1400px] px-4 pt-3 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink">{APP_NAME}</h1>
            <p className="text-xs text-ink-2">
              Acquisition &amp; attribution · Google Merchandise Store GA4 sample
              {meta.data?.source === "synthetic" && (
                <span className="ml-2 whitespace-nowrap rounded bg-surface-2 px-1.5 py-0.5 font-medium text-ink-2">synthetic data</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AuthorCredit compact />
            <button
              type="button"
              onClick={() => onModeChange(mode === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {mode === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div role="group" aria-label="Filters" className="mt-3 flex flex-wrap items-end gap-2">
          <Field id={ids.preset} label="Date range">
            <select
              id={ids.preset}
              className={controlCls}
              value={preset?.id ?? "custom"}
              onChange={(e) => {
                const p = DATE_PRESETS.find((d) => d.id === e.target.value);
                if (p) setFilters({ start: p.start, end: p.end });
              }}
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              {!preset && <option value="custom">Custom</option>}
            </select>
          </Field>
          <Field id={ids.start} label="From">
            <input
              id={ids.start}
              type="date"
              className={`${controlCls} tabular`}
              min={minDate}
              max={filters.end}
              value={filters.start}
              onChange={(e) => e.target.value && setFilters({ start: e.target.value })}
            />
          </Field>
          <Field id={ids.end} label="To">
            <input
              id={ids.end}
              type="date"
              className={`${controlCls} tabular`}
              min={filters.start}
              max={maxDate}
              value={filters.end}
              onChange={(e) => e.target.value && setFilters({ end: e.target.value })}
            />
          </Field>
          <Field id={ids.device} label="Device">
            <select id={ids.device} className={controlCls} value={filters.device} onChange={(e) => setFilters({ device: e.target.value })}>
              <option value="all">All devices</option>
              {meta.data?.devices.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field id={ids.country} label="Country">
            <select
              id={ids.country}
              className={`${controlCls} max-w-[12rem]`}
              value={filters.country}
              onChange={(e) => setFilters({ country: e.target.value })}
            >
              <option value="all">All countries</option>
              {meta.data?.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-hairline py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <SectionNav active={active} />
          <ActiveFilters />
        </div>
      </div>
    </header>
  );
}

/**
 * Publishes the header's height as --header-h while it is sticky, so in-page
 * anchors scroll to just below it (0 when it scrolls away on small screens).
 */
function useHeaderHeightVar() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => {
      const sticky = getComputedStyle(el).position === "sticky";
      root.style.setProperty("--header-h", sticky ? `${el.offsetHeight}px` : "0px");
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return ref;
}
