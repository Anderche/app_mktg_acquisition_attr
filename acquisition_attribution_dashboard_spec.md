# Technical Specification — Acquisition & Attribution Dashboard (GA4 + MTA)

**Author:** Anders Kiss
**Version:** 1.0
**Status:** Draft
**Type:** Portfolio demo — single-page analytics app for retail/DTC management

---

## 1. Purpose

Build a single-page web dashboard that shows management how each acquisition channel drives users, conversions and revenue for a modern online retailer, and how credit for those conversions changes under different attribution models. The app uses the public **GA4 obfuscated ecommerce sample** (Google Merchandise Store) in BigQuery, with multi-touch attribution (MTA) computed in Python using the **ChannelAttribution** package.

**Business questions answered:**

1. Which channels bring the most users, conversions and revenue?
2. How does channel credit change between last-click, first-click and Markov-chain attribution?
3. What are the most common customer journeys that end in a purchase?
4. Which campaigns perform best and worst on revenue and conversion rate?

---

## 2. Scope

**In scope**
- Channel KPI table and charts (source/medium)
- Attribution comparison (last-click, first-click, linear, Markov first-order)
- Sankey diagram of top conversion paths
- Campaign leaderboard
- Global filters: date range, device category, country
- "Data Sources & Limitations" panel

**Out of scope**
- Marketing mix modeling (MMM) and spend data (the GA4 sample has no cost data)
- User authentication and multi-tenant access
- Real-time data ingestion

---

## 3. Data Source

| Item | Detail |
|---|---|
| Dataset | `bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*` |
| Period | 2020-11-01 to 2021-01-31 (about 3 months) |
| Grain | One row per event |
| Access | BigQuery sandbox (free tier, about 1 TB of queries per month) |
| Key fields | `event_date`, `event_timestamp`, `event_name`, `user_pseudo_id`, `event_params` (`ga_session_id`, `source`, `medium`, `campaign`), `device.category`, `geo.country`, `ecommerce.transaction_id`, `ecommerce.purchase_revenue_in_usd` |

**Known data limitations**
- Some values are obfuscated (`<Other>`, `(data deleted)`) and are grouped into an "Other / Unknown" channel.
- There is no ad spend, so ROAS and CAC cannot be computed. The app focuses on volume and revenue credit.
- `user_pseudo_id` is cookie-based, so cross-device journeys are broken into separate users.

---

## 4. Architecture

```
BigQuery (GA4 public sample)
        │  SQL (scheduled batch script)
        ▼
Python ETL  ──►  ChannelAttribution (heuristic + Markov)
        │
        ▼
DuckDB file (analytics.duckdb)  ← pre-aggregated tables
        │
        ▼
FastAPI (REST JSON endpoints)
        │
        ▼
React + Vite + TypeScript SPA  (Apache ECharts for charts)
```

**Design choice:** All heavy computation runs offline in a batch job. The API only reads small pre-aggregated tables from DuckDB, so the dashboard loads in under one second and stays far below BigQuery's free query limits.

---

## 5. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Warehouse | Google BigQuery | Hosts the GA4 public dataset |
| Extraction | `google-cloud-bigquery`, `pandas` | Pull session and path data |
| Attribution | `ChannelAttribution` (Python) | Heuristic and Markov-chain models |
| Local store | DuckDB | Fast, file-based, no server to run |
| API | FastAPI + Pydantic + Uvicorn | Typed, async, auto-generated OpenAPI docs |
| Frontend | React 18, Vite, TypeScript | Modern single-page app |
| Charts | Apache ECharts (`echarts-for-react`) | Native Sankey, grouped bars, tables |
| Data fetching | TanStack Query | Caching and loading states |
| Styling | Tailwind CSS | Fast, consistent layout |
| Testing | `pytest`, Vitest | Backend and frontend tests |
| Deploy | Docker → Railway or Render (API); Vercel (frontend) | Low cost, simple CI/CD |

Streamlit is not used.

---

## 6. Data Pipeline

### 6.1 Step 1 — Session extraction (SQL)

Build one row per session with its channel and outcome:

```sql
WITH events AS (
  SELECT
    user_pseudo_id,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS session_id,
    TIMESTAMP_MICROS(event_timestamp) AS ts,
    event_name,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source')   AS source,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'medium')   AS medium,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign') AS campaign,
    device.category AS device,
    geo.country     AS country,
    ecommerce.purchase_revenue_in_usd AS revenue
  FROM `bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20201101' AND '20210131'
)
SELECT
  user_pseudo_id, session_id,
  MIN(ts) AS session_start,
  ANY_VALUE(device) AS device, ANY_VALUE(country) AS country,
  COALESCE(MAX(source), '(direct)')  AS source,
  COALESCE(MAX(medium), '(none)')    AS medium,
  COALESCE(MAX(campaign), '(not set)') AS campaign,
  COUNTIF(event_name = 'purchase') > 0 AS converted,
  SUM(IF(event_name = 'purchase', revenue, 0)) AS revenue
FROM events
GROUP BY user_pseudo_id, session_id;
```

Output: `sessions.parquet`.

### 6.2 Step 2 — Channel grouping (Python)

Map each source/medium pair to a default channel group with a rules table:

| Rule | Channel |
|---|---|
| medium = `organic` | Organic Search |
| medium in (`cpc`, `ppc`, `paid`) | Paid Search |
| medium = `referral` | Referral |
| medium = `email` | Email |
| source = `(direct)` and medium in (`(none)`, `(not set)`) | Direct |
| value contains `<Other>` or `(data deleted)` | Other / Unknown |

### 6.3 Step 3 — Path building

- Sort each user's sessions by `session_start`.
- Split a path at each purchase, so every conversion has its own journey.
- Apply a **30-day lookback window**; drop touchpoints older than 30 days before the conversion.
- Join channels with `" > "`, e.g. `Organic Search > Referral > Direct`.
- Aggregate to `path`, `total_conversions`, `total_conversion_value`, `total_null` (paths with no conversion).

### 6.4 Step 4 — Attribution models

```python
from ChannelAttribution import heuristic_models, markov_model

h = heuristic_models(paths, "path", "total_conversions",
                     var_value="total_conversion_value")
m = markov_model(paths, "path", "total_conversions",
                 var_value="total_conversion_value",
                 var_null="total_null", order=1, out_more=True)
```

Outputs:
- `attribution_by_channel`: channel × model × conversions × revenue
- `removal_effects`: channel × removal effect (from Markov, `out_more=True`)
- `transition_matrix`: from-channel × to-channel × probability

### 6.5 Step 5 — Load to DuckDB

| Table | Grain |
|---|---|
| `fact_sessions` | session |
| `agg_channel_daily` | date × channel × device × country |
| `agg_attribution` | channel × model |
| `agg_paths_top` | top 50 converting paths |
| `agg_sankey_links` | step × source node × target node × value |
| `agg_campaigns` | campaign × source/medium |

The batch job runs with `make etl`. It's idempotent and finishes in about 2 minutes.

---

## 7. API Specification (FastAPI)

All endpoints accept the query parameters `start`, `end`, `device` and `country`.

| Method | Endpoint | Returns |
|---|---|---|
| GET | `/api/kpis` | Total users, sessions, conversions, revenue, conversion rate, AOV |
| GET | `/api/channels` | Per channel: users, sessions, conversions, revenue, CVR, % of revenue |
| GET | `/api/attribution` | Per channel: conversions and revenue under each model |
| GET | `/api/removal-effects` | Per channel: Markov removal effect (%) |
| GET | `/api/sankey?steps=4&top=20` | `nodes[]`, `links[]` for the Sankey chart |
| GET | `/api/campaigns?sort=revenue&limit=25` | Campaign leaderboard rows |
| GET | `/api/meta` | Data freshness, date coverage, limitations text |

Example response (`/api/attribution`):

```json
[
  {"channel": "Organic Search", "last_click": 812.0, "first_click": 945.0,
   "linear": 870.4, "markov": 901.7}
]
```

Attribution tables are computed for the full period. Date filters apply to KPIs, channels, campaigns and the Sankey chart.

---

## 8. Frontend — Page Layout

A single scrolling page in a 12-column grid:

1. **Header bar:** title, date-range picker, device and country dropdowns, a "Data notes" button.
2. **KPI strip (6 cards):** users, sessions, conversions, revenue, conversion rate, AOV. Each card has a sparkline and the change vs. the previous period.
3. **Channel performance:**
   - Left (7 columns): horizontal bars of revenue by channel.
   - Right (5 columns): a sortable table (users, sessions, CVR, revenue, % share).
4. **Attribution comparison:**
   - Grouped bars with channels on the x-axis and one bar each for last-click, first-click, linear and Markov.
   - A toggle switches between conversions and revenue.
   - A small chart of Markov removal effects beside it.
   - Caption: "Channels gaining credit under Markov are undervalued by last-click."
5. **Conversion paths (Sankey):**
   - Columns represent journey steps 1 to 4, ending in a "Purchase" node.
   - Hovering shows path count and conversion share.
   - A slider sets the number of top paths shown (10–50).
6. **Campaign leaderboard:**
   - A table with campaign, source/medium, sessions, conversions, CVR, revenue and revenue per session.
   - Conditional formatting (green/red), search box, column sorting, CSV export.
7. **Footer panel:** data sources, methodology and limitations.

**Design rules**
- One consistent color per channel across all charts.
- Colorblind-safe palette; supports light and dark mode.
- Desktop-first layout that works down to tablet width (768 px).

---

## 9. Non-Functional Requirements

| Area | Target |
|---|---|
| Performance | API p95 < 300 ms; first page load < 2 s |
| Cost | $0–5 per month (free tiers) |
| Reliability | ETL failure keeps the last good DuckDB file |
| Security | Read-only GCP service account; secrets in environment variables; CORS restricted to the frontend domain |
| Accessibility | WCAG AA contrast; keyboard-navigable filters |
| Reproducibility | Pinned dependencies (`uv` / `pnpm`), Dockerfile, `Makefile` |

---

## 10. Testing

- **Data tests:** row counts, no null `session_id`, revenue totals match BigQuery within 0.5%.
- **Model tests:** the sum of attributed conversions equals total conversions for every model.
- **API tests:** `pytest` with FastAPI's `TestClient`; schema validation on all endpoints.
- **Frontend tests:** Vitest component tests for the filters and chart data mapping.
- **CI:** GitHub Actions runs lint (ruff, eslint), tests, and the Docker build on every push.

---

## 11. Repository Structure

```
attribution-dashboard/
├── etl/            # SQL, path building, attribution, DuckDB load
├── api/            # FastAPI app, routers, schemas
├── web/            # React + Vite SPA
├── data/           # analytics.duckdb (gitignored)
├── tests/
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 12. Milestones

| Week | Deliverable |
|---|---|
| 1 | BigQuery SQL, sessions extract, channel grouping |
| 2 | Path building, attribution models, DuckDB tables |
| 3 | FastAPI endpoints with tests |
| 4 | React SPA: KPIs, channels, attribution chart |
| 5 | Sankey chart, campaign leaderboard, filters |
| 6 | Polish, deploy, README with screenshots and a methodology write-up |

---

## 13. Future Extensions

- A data-driven attribution model (logistic regression or Shapley values) to compare against Markov.
- An LLM "insight summary" panel that explains week-over-week channel shifts.
- Synthetic ad-spend data to add ROAS and CAC views.
- A connector for a real GA4 property through the GA4 Data API.
