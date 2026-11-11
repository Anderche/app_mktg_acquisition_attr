import { useState } from "react";
import { REFERENCE_TILES, type ReferenceTile } from "../content/reference";
import { fmtCompact } from "../format";
import { useMeta } from "../queries";
import { hueFor, hueStyle, sectionHref } from "../sections";
import { HueDot } from "./Chip";

// Which tile is open ("" = all collapsed, the default for new visitors).
export const OPEN_KEY = "touchline-reference-open";

type TileId = ReferenceTile["id"];

function readOpen(): TileId | null {
  try {
    const v = localStorage.getItem(OPEN_KEY);
    return REFERENCE_TILES.some((t) => t.id === v) ? (v as TileId) : null;
  } catch {
    return null;
  }
}

function writeOpen(id: TileId | null) {
  try {
    if (id) localStorage.setItem(OPEN_KEY, id);
    else localStorage.removeItem(OPEN_KEY);
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
  const hue = hueFor(tile.link.section);
  return (
    <article
      id={`tile-panel-${tile.id}`}
      aria-labelledby={`tile-${tile.id}`}
      className="min-w-0 rounded-card border border-t-4 bg-surface p-5 shadow-card"
      style={{ borderColor: "var(--border)", borderTopColor: `var(--hue-${hue}-edge)` }}
    >
      <h3 id={`tile-${tile.id}`} className="font-display text-lg font-semibold text-ink">
        <span className="mr-2 text-caption font-medium uppercase tracking-[0.08em] text-muted">{tile.numeral}</span>
        {tile.title}
      </h3>
      <div className="mt-2 grid gap-x-8 gap-y-3 md:grid-cols-2">
        <div>
          <p className="text-sm text-ink-2">{tile.lede}</p>
          {tile.id === "source" && (
            <div className="mt-3">
              <SourceStats />
            </div>
          )}
        </div>
        <ul className="space-y-1.5 text-sm text-ink-2">
          {tile.points.map((p) => (
            <li key={p.term}>
              <b className="font-semibold text-ink">{p.term}:</b> {p.text}
            </li>
          ))}
        </ul>
      </div>
      <a href={sectionHref(tile.link.section)} className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
        {tile.link.label} <span aria-hidden>→</span>
      </a>
    </article>
  );
}

function chipLabel(tile: ReferenceTile, sessions: number | undefined): string {
  if (tile.id === "source" && sessions) return `${tile.title} · ${fmtCompact(sessions)} sessions`;
  return tile.title;
}

/** Collapsed by default: a strip of three chips, each opening its tile in place. */
export function ReferenceTiles() {
  const meta = useMeta();
  const [open, setOpen] = useState<TileId | null>(readOpen);
  const toggle = (id: TileId) => {
    const next = open === id ? null : id;
    setOpen(next);
    writeOpen(next);
  };
  const openTile = REFERENCE_TILES.find((t) => t.id === open);

  return (
    <section aria-label="About this analysis" className="col-span-12 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-caption font-medium uppercase tracking-[0.08em] text-muted">About this analysis</span>
        {REFERENCE_TILES.map((tile) => {
          const hue = hueFor(tile.link.section);
          const isOpen = open === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => toggle(tile.id)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? `tile-panel-${tile.id}` : undefined}
              className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium text-ink transition-colors hover:brightness-[0.97]"
              style={isOpen ? hueStyle(hue) : { borderColor: "var(--border)", background: "var(--surface-1)" }}
            >
              <HueDot hue={hue} />
              <span className="text-muted">{tile.numeral} ·</span>
              {chipLabel(tile, meta.data?.stats.sessions)}
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}>
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          );
        })}
      </div>
      {openTile && (
        <div className="mt-3">
          <Tile tile={openTile} />
        </div>
      )}
    </section>
  );
}
