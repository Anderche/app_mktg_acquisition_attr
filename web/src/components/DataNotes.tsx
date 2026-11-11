import { fmtInt } from "../format";
import { useMeta } from "../queries";
import { eyebrowFor } from "../sections";
import { APP_NAME, AUTHOR, AuthorCredit } from "./Credit";

export function DataNotes() {
  const { data } = useMeta();
  return (
    <footer id="data-notes" aria-labelledby="data-notes-title" className="border-t border-hairline bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 pt-10 md:px-6">
        <p className="mb-1 text-caption font-medium uppercase tracking-[0.08em] text-muted" aria-hidden>
          {eyebrowFor("data-notes")}
        </p>
        <h2 id="data-notes-title" className="font-display text-title font-semibold text-ink">
          Sources, method and limits
        </h2>
      </div>
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 text-sm text-ink-2 md:grid-cols-3 md:px-6">
        <div>
          <h3 className="mb-2 font-display text-base font-semibold text-ink">Data sources</h3>
          <p>
            <code className="break-all rounded bg-surface-2 px-1 text-xs">
              {data?.dataset ?? "bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*"}
            </code>
          </p>
          <p className="mt-2">
            Google Merchandise Store, {data ? `${data.start_date} to ${data.end_date}` : "Nov 2020 – Jan 2021"}.
            {data?.source === "synthetic" && " This build uses synthetic sessions that follow the same schema."}
          </p>
          {data && (
            <dl className="tabular mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted">Sessions</dt>
              <dd>{fmtInt(data.stats.sessions ?? 0)}</dd>
              <dt className="text-muted">Users</dt>
              <dd>{fmtInt(data.stats.users ?? 0)}</dd>
              <dt className="text-muted">Conversions</dt>
              <dd>{fmtInt(data.stats.conversions ?? 0)}</dd>
              <dt className="text-muted">Data refreshed</dt>
              <dd>{new Date(data.generated_at).toLocaleString()}</dd>
            </dl>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-display text-base font-semibold text-ink">Methodology</h3>
          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              One row per GA4 session, labelled with its landing source/medium, which maps to a default channel group. Referrals
              from the store’s own domain count as Direct.
            </li>
            <li>
              Journeys are a user’s sessions in time order, split at each purchase, with a {data?.lookback_days ?? 30}-day lookback
              window.
            </li>
            <li>
              Last-click, first-click and linear credit come from heuristic rules. Markov uses a first-order transition model and
              removal effects (ChannelAttribution).
            </li>
            <li>Every model hands out the same total number of conversions; only the split by channel differs.</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-display text-base font-semibold text-ink">Limitations</h3>
          <ul className="list-disc space-y-1.5 pl-4">
            {(data?.limitations ?? []).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-ink-2 md:px-6">
          <span>
            <b className="font-semibold text-ink">{APP_NAME}</b> · built by {AUTHOR.name}
          </span>
          <AuthorCredit />
        </div>
      </div>
    </footer>
  );
}
