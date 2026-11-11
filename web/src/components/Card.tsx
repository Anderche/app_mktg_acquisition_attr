import type { ReactNode } from "react";
import { eyebrowFor } from "../sections";

interface SectionProps {
  id: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ id, title, subtitle, actions, children, className = "" }: SectionProps) {
  const eyebrow = eyebrowFor(id);
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`col-span-12 min-w-0 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-1 text-caption font-medium uppercase tracking-[0.08em] text-muted" aria-hidden>
              {eyebrow}
            </p>
          )}
          <h2 id={`${id}-title`} className="font-display text-title font-semibold text-ink">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "", busy = false }: { children: ReactNode; className?: string; busy?: boolean }) {
  return (
    <div
      aria-busy={busy}
      className={`min-w-0 rounded-card border border-border bg-surface p-4 shadow-card transition-opacity md:p-5 duration-200 ${busy ? "opacity-60" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-medium text-ink">{children}</h3>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Skeleton({ height }: { height: number }) {
  return <div className="animate-pulse rounded-lg bg-surface-2" style={{ height }} aria-hidden />;
}

export function ErrorNote({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-ink-2">
      <b className="text-ink">Couldn’t load this section.</b> {msg}
      {msg.startsWith("503") || msg.includes("fetch") ? (
        <span>
          {" "}
          Start the API with <code className="rounded bg-surface px-1">make api</code> after building data with{" "}
          <code className="rounded bg-surface px-1">make etl</code>.
        </span>
      ) : null}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            o.value === value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TableToggle({ showTable, onToggle }: { showTable: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showTable}
      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      {showTable ? "Show chart" : "Show table"}
    </button>
  );
}

export function ChannelDot({ color }: { color: string }) {
  return <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-sm align-middle" style={{ background: color }} />;
}
