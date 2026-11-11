import { APP_NAME, GitHubIcon, REPO_URL } from "./Credit";

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="col-span-12 min-w-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="max-w-2xl">
          <h2 id="intro-title" className="text-xl font-semibold tracking-tight text-ink">
            Which channels really earn the sale?
          </h2>
          <p className="mt-1.5 text-sm text-ink-2">
            {APP_NAME} follows every customer journey to purchase and compares how last-click, first-click, linear and Markov
            attribution split the credit, so you can see which channels the usual last-click report undervalues.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href="#attribution"
            className="inline-flex h-10 items-center rounded-lg bg-[var(--cta-bg)] px-4 text-sm font-semibold text-[var(--cta-text)] hover:opacity-90"
          >
            See what last-click misses <span aria-hidden className="ml-1.5">→</span>
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <GitHubIcon />
            View source
          </a>
        </div>
      </div>
    </section>
  );
}
