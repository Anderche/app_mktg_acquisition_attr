import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { COVERAGE, DATE_PRESETS, presetFor, useFilters } from "../filters";
import { useMeta } from "../queries";
import { activeFilterChips, ActiveFilters } from "./ActiveFilters";

const controlCls =
  "h-9 rounded-lg border border-border bg-surface px-2.5 text-sm text-ink hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * The date, device and country controls. `inline` packs them into one row with
 * the labels inside the controls; `stacked` shows visible labels (filter sheet).
 */
export function FilterControls({ layout }: { layout: "inline" | "stacked" }) {
  const { filters, setFilters } = useFilters();
  const meta = useMeta();
  const ids = { preset: useId(), start: useId(), end: useId(), device: useId(), country: useId() };
  const preset = presetFor(filters);
  const minDate = meta.data?.start_date ?? COVERAGE.start;
  const maxDate = meta.data?.end_date ?? COVERAGE.end;
  const stacked = layout === "stacked";

  // Inline: a visually hidden <label> keeps every control named for screen readers.
  const label = (id: string, text: string) => (
    <label htmlFor={id} className={stacked ? "mb-1 block text-caption font-medium uppercase tracking-wide text-muted" : "sr-only"}>
      {text}
    </label>
  );
  const dateField = (id: string, text: string, input: JSX.Element) =>
    stacked ? (
      <div>
        {label(id, text)}
        {input}
      </div>
    ) : (
      <div className="flex h-9 items-center rounded-lg border border-border bg-surface pl-2.5 hover:bg-surface-2">
        <label htmlFor={id} className="mr-1 text-caption font-medium uppercase tracking-wide text-muted">
          {text}
        </label>
        {input}
      </div>
    );
  const dateInputCls = stacked ? `${controlCls} tabular w-full` : "tabular h-8 rounded-md bg-transparent pr-2 text-sm text-ink focus:outline-none";

  return (
    <div role="group" aria-label="Filters" className={stacked ? "grid gap-4" : "flex flex-wrap items-center gap-2"}>
      <div>
        {label(ids.preset, "Date range")}
        <select
          id={ids.preset}
          className={`${controlCls} ${stacked ? "w-full" : ""}`}
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
      </div>
      <div className={stacked ? "grid grid-cols-2 gap-3" : "contents"}>
        {dateField(
          ids.start,
          "From",
          <input
            id={ids.start}
            type="date"
            className={dateInputCls}
            min={minDate}
            max={filters.end}
            value={filters.start}
            onChange={(e) => e.target.value && setFilters({ start: e.target.value })}
          />,
        )}
        {dateField(
          ids.end,
          "To",
          <input
            id={ids.end}
            type="date"
            className={dateInputCls}
            min={filters.start}
            max={maxDate}
            value={filters.end}
            onChange={(e) => e.target.value && setFilters({ end: e.target.value })}
          />,
        )}
      </div>
      <div>
        {label(ids.device, "Device")}
        <select
          id={ids.device}
          className={`${controlCls} ${stacked ? "w-full" : ""}`}
          value={filters.device}
          onChange={(e) => setFilters({ device: e.target.value })}
        >
          <option value="all">All devices</option>
          {meta.data?.devices.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        {label(ids.country, "Country")}
        <select
          id={ids.country}
          className={`${controlCls} ${stacked ? "w-full" : "max-w-[12rem]"}`}
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
      </div>
    </div>
  );
}

/** Phone layout: a "Filters (n)" button that opens the controls in a bottom sheet. */
export function FilterSheet() {
  const { filters } = useFilters();
  const ref = useRef<HTMLDialogElement>(null);
  const count = activeFilterChips(filters).length;
  const titleId = useId();

  const open = () => {
    const d = ref.current;
    if (!d) return;
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
  };
  const close = () => ref.current?.close?.();

  // Close when the viewport grows past the phone layout, so it can't linger.
  useEffect(() => {
    const mq = window.matchMedia?.("(min-width: 768px)");
    if (!mq) return;
    const onChange = () => mq.matches && close();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-ink hover:bg-surface-2"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <path d="M2 4h12M4.5 8h7M7 12h2" />
        </svg>
        {/* Narrow phones show just the icon and count; the name stays for screen readers. */}
        <span className="sr-only sm:not-sr-only">Filters</span>
        {count > 0 && (
          <span className="rounded-full bg-[var(--chip-active-bg)] px-1.5 text-xs text-[var(--chip-active-text)]">{count}</span>
        )}
      </button>
      {/* Portalled to <body> so the header's backdrop-filter can't affect it. */}
      {createPortal(
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="filter-sheet"
        // A click on the backdrop lands on the <dialog> itself.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 id={titleId} className="font-display text-title font-semibold text-ink">
              Filters
            </h2>
            <button type="button" onClick={close} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-accent hover:bg-surface-2">
              Done
            </button>
          </div>
          <FilterControls layout="stacked" />
          <div className="mt-4">
            <ActiveFilters />
          </div>
        </div>
      </dialog>,
        document.body,
      )}
    </>
  );
}
