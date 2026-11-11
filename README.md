# Acquisition & Attribution Dashboard

A single-page analytics app that shows how each acquisition channel drives users, conversions and revenue for an online retailer, and how credit for those conversions shifts between last-click, first-click, linear and Markov-chain attribution.

Built on the public **GA4 obfuscated ecommerce sample** (Google Merchandise Store, Nov 2020 – Jan 2021). Multi-touch attribution is computed offline with [ChannelAttribution](https://channelattribution.io). The full spec is in [acquisition_attribution_dashboard_spec.md](acquisition_attribution_dashboard_spec.md).

**It answers four questions:**

1. Which channels bring the most users, conversions and revenue?
2. How does channel credit change between last-click, first-click and Markov attribution?
3. Which customer journeys most often end in a purchase?
4. Which campaigns perform best and worst on revenue and conversion rate?

## Reference
Google_cloud_project_id: ```railway-app-mktg-acquisition```

## Quick start

Requires Python 3.11–3.13 with [uv](https://docs.astral.sh/uv/), Node 20+ with pnpm, and a C++ compiler (ChannelAttribution builds from source).

```bash
make install   # uv sync + pnpm install
make etl       # build data/analytics.duckdb from synthetic GA4-shaped data (~2 s)
make dev       # API on :8000, dashboard on http://localhost:5173
```

`make install` creates `.venv` with `uv sync`. Makefile targets call `uv run`, so `make etl`, `make dev`, and `make test` use that environment without activating it. To run Python, pytest, or a REPL yourself, activate it in the current shell:

```bash
source .venv/bin/activate
```

The prompt shows `(.venv)` and `python` points at the project interpreter. Leave it with `deactivate`.

If port 8000 is taken, run `make dev API_PORT=8010`.

To use the real BigQuery dataset instead of synthetic data, point `GOOGLE_APPLICATION_CREDENTIALS` at a read-only service-account key (and optionally `GCP_PROJECT` for billing), then:

```bash
make etl SOURCE=bigquery
```

The query scans about 3 months of the sample, which fits comfortably in the BigQuery sandbox's free tier.

With Docker: `docker compose up --build`, then open http://localhost:8080. The API container builds the database on first start and keeps it in a volume.

### Synthetic vs. real data

The default `make etl` generates sessions with the same columns and value conventions as `etl/sql/sessions.sql` returns from BigQuery: obfuscated `<Other>` / `(data deleted)` sources, holiday seasonality with a Black Friday/Cyber Monday spike, cookie-scoped users, and multi-session journeys where upper-funnel channels assist more than they close. That lets the whole app run without GCP credentials. The dashboard header shows a "synthetic data" badge whenever the database was built this way.

## Architecture

```
BigQuery (GA4 public sample)  ──or──  synthetic generator
        │  etl/sql/sessions.sql
        ▼
Python ETL ── channel grouping ── path building ── ChannelAttribution
        │
        ▼
data/analytics.duckdb   (built in a temp file, swapped in atomically)
        │
        ▼
FastAPI  (read-only, reopens the file when the ETL replaces it)
        │
        ▼
React + Vite + TypeScript SPA  (ECharts, TanStack Query, Tailwind)
```

All heavy work runs in the batch job. The API only aggregates small DuckDB tables, so each endpoint answers in a few milliseconds.

| Layer | Tech |
|---|---|
| Extraction | `google-cloud-bigquery`, pandas |
| Attribution | ChannelAttribution 2.2 (heuristic + first-order Markov) |
| Store | DuckDB |
| API | FastAPI, Pydantic, Uvicorn |
| Frontend | React 18, Vite, TypeScript, Apache ECharts, TanStack Query, Tailwind CSS |
| Tests | pytest, Vitest + Testing Library |

## Pipeline

| Step | Module | What it does |
|---|---|---|
| 1. Extract | `etl/extract.py` | One row per session: landing source/medium/campaign (from the session's first event that has one), device, country, converted, revenue |
| 2. Channels | `etl/channels.py` | Rules table → Organic Search, Paid Search, Direct, Referral, Email, Other / Unknown. Referrals from the store's own domain (`googlemerchandisestore.com`) are self-referrals and count as Direct, like GA4's unwanted referrals |
| 3. Paths | `etl/paths.py` | Sort each user's sessions, split at every purchase, apply a 30-day lookback, aggregate to `path / total_conversions / total_conversion_value / total_null` |
| 4. Models | `etl/attribution.py` | `heuristic_models` + `markov_model(order=1, out_more=True)`; removal effects normalised to shares |
| 5. Load | `etl/load.py` | Writes every table to a temp DuckDB file, then `os.replace`. If a run fails, the last good file stays in place |

### DuckDB tables

| Table | Grain | Used by |
|---|---|---|
| `fact_sessions` | session | KPIs, channels, campaigns (filtered at request time) |
| `fact_paths` | conversion (journey) | Sankey (filtered by conversion date, device, country) |
| `agg_paths` | distinct path | Model input; kept for inspection |
| `agg_attribution` | channel × model | `/api/attribution` |
| `agg_removal_effects` | channel | `/api/removal-effects` |
| `agg_transitions` | from-channel × to-channel | Empirical Markov transition matrix (analysis) |
| `etl_meta` | key/value | Source, refresh time, coverage, limitations |

This differs a little from the spec's table list. KPIs, channels, campaigns and the Sankey are computed from the two small fact tables at request time rather than from fixed pre-aggregates, so the date, device and country filters apply to all of them, and distinct-user counts stay correct for any date range.

## API

All filterable endpoints accept `start`, `end` (YYYY-MM-DD), `device` and `country`. Interactive docs are served at `/docs`.

| Endpoint | Returns |
|---|---|
| `GET /api/kpis` | Users, sessions, conversions, revenue, CVR and AOV; the previous period (the preceding whole month(s) for month ranges, otherwise the same number of days); a daily series for sparklines |
| `GET /api/channels` | Per channel: users, sessions, conversions, revenue, CVR, revenue share |
| `GET /api/attribution` | Per channel × model, for both conversions and revenue |
| `GET /api/removal-effects` | Markov removal effect and its share per channel |
| `GET /api/sankey?steps=4&top=20` | Nodes, links and top paths. Journeys are cut to their last `steps` touches |
| `GET /api/campaigns?sort=revenue&limit=25` | Campaign × source/medium leaderboard |
| `GET /api/meta` | Data source, refresh time, coverage, filter options, limitations |

Attribution is fitted on the full period, so the date and dimension filters don't change it. The UI says so next to the chart.

## Dashboard

- **Filter bar:** date presets plus custom range, device, country. The current slice is stored in the URL so it can be shared.
- **KPI strip:** six cards, each with a sparkline and the change vs. the previous period.
- **Channel performance:** revenue bars and a sortable table.
- **Attribution comparison:** grouped bars across the four models with a conversions/revenue toggle, plus a Markov removal-effects chart. The three heuristic models are drawn in grays and Markov in an accent colour, so the comparison stands out.
- **Conversion paths:** a Sankey of the top 10–50 journeys ending in Purchase, with hover counts and shares.
- **Campaign leaderboard:** search, column sorting and CSV export. Cells ≥20% above or below the blended rate are tinted and marked ▲/▼; rows with under 100 sessions aren't tinted.
- **Data notes:** sources, methodology and limitations.

Every channel keeps one colour across all charts. The six-slot palette was checked for colour-vision-deficiency separation in both light and dark mode. Every chart also has a table view or direct labels, so colour is never the only way to read a value. Dark mode follows the OS setting and can be toggled.

## Testing

```bash
make test        # pytest + vitest
make lint        # ruff + eslint
```

- **Data tests:** row counts, no null session IDs, revenue totals match the source within 0.5%, a failed load leaves the previous file intact.
- **Model tests:** for every model, attributed conversions and revenue sum to the totals. Removal-effect shares sum to 1, and transition rows sum to 1.
- **ETL unit tests:** channel rules, path splitting at each purchase, the lookback window, transition counts.
- **API tests:** schema validation on every endpoint, filter behaviour, previous-period logic, parameter validation, a 503 when the database is missing.
- **Frontend tests:** filter ↔ URL round-trip, chart data mapping (stable channel colours, model series order, Sankey nodes), campaign search/sort/CSV escaping/conditional formatting.

CI (`.github/workflows/ci.yml`) runs lint and tests for both halves, then builds the Docker images.

## Deploy

- **API:** the root `Dockerfile` runs anywhere that runs containers (Railway, Render, Fly). Set `ETL_SOURCE=bigquery` and provide credentials to build from the real dataset on first boot, or mount a prebuilt `analytics.duckdb` at `/app/data`. Set `CORS_ORIGINS` to the frontend's origin.
- **Frontend:** `pnpm build` in `web/` produces a static `dist/` for Vercel or any static host. Set `VITE_API_URL` to the API's public URL at build time.

## Known limitations

- Some sources, mediums and campaigns are obfuscated in the public sample and land in "Other / Unknown".
- There's no ad-spend data, so ROAS and CAC aren't computed.
- `user_pseudo_id` is cookie-based, so a journey across devices shows up as separate users.
- The Markov model is first-order: it captures which channel follows which, not longer-range dependencies.

## Repository layout

```
etl/        SQL, extraction, channel rules, paths, attribution, DuckDB load
api/        FastAPI app, DuckDB access, response schemas
web/        React + Vite SPA
tests/      pytest suite (ETL, data/model checks, API)
data/       analytics.duckdb (gitignored, rebuilt by `make etl`)
```
