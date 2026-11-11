import { useState } from "react";
import { REFERENCE_TILES, type ReferenceTile } from "../content/reference";
import { fmtCompact } from "../format";
import { useMeta } from "../queries";
import { sectionHref } from "../sections";

export const HIDE_KEY = "touchline-reference-hidden";

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(HIDE_KEY, "1");
    else localStorage.removeItem(HIDE_KEY);
  } catch {
    // storage unavailable: the choice applies for this visit only
  }
}

function SourceStats() {
  const { data } = useMeta();
  if (!data) return <div className="h-[52px] animate-pulse rounded-lg bg-surface-2" aria-hidden />;
  const stats = [
    { label: "Sessions", value: fmtCompact(data.stats.sessions ?? 0) },
    { label: "Users", value: fmtCompact(data.stats.users ?? 0) },
    { label: "Conversions", value: fmtCompact(data.stats.conversions ?? 0) },
  ];
  return (
    <div>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-surface-2 px-2.5 py-2">
            <dt className="text-caption text-muted">{s.label}</dt>
            <dd className="text-base font-semibold text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-caption text-muted">
        {data.source === "bigquery" ? "Real BigQuery extract" : "Synthetic build"} · refreshed{" "}
        {new Date(data.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

function Tile({ tile }: { tile: ReferenceTile }) {
  return (
    <article aria-labelledby={`tile-${tile.id}`} className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-5 shadow-card">
      <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted" aria-hidden>
        {tile.numeral}
      </p>
      <h3 id={`tile-${tile.id}`} className="mt-0.5 font-display text-lg font-semibold text-ink">
        {tile.title}
      </h3>
      <p className="mt-1.5 text-sm text-ink-2">{tile.lede}</p>
      {tile.id === "source" && (
        <div className="mt-3">
          <SourceStats />
        </div>
      )}
      <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
        {tile.points.map((p) => (
          <li key={p.term}>
            <b className="font-semibold text-ink">{p.term}:</b> {p.text}
          </li>
        ))}
      </ul>
      <a href={sectionHref(tile.link.section)} className="mt-auto pt-4 text-sm font-medium text-accent hover:underline">
        {tile.link.label} <span aria-hidden>→</span>
      </a>
    </article>
  );
}

export function ReferenceTiles() {
  const [hidden, setHidden] = useState(readHidden);
  const toggle = () => {
    setHidden((h) => {
      writeHidden(!h);
      return !h;
    });
  };

  return (
    <section aria-labelledby="reference-title" className="col-span-12 min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="reference-title" className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
          About this analysis
        </h2>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!hidden}
          aria-controls="reference-tiles"
          className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          {hidden ? "Show" : "Hide"}
        </button>
      </div>
      {!hidden && (
        <div id="reference-tiles" className="grid gap-3 md:grid-cols-3">
          {REFERENCE_TILES.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      )}
    </section>
  );
}
