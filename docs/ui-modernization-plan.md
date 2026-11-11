# Touchline UI modernization plan

Branch: `feature/ui-modernization` (from `main` at `0f7f310`).

## Goal

Make Touchline feel like a polished, editorial analytics product: two typefaces, reference tiles that explain the data and its business value, in-app navigation through chips, and a lighter visual system. Data, API and chart logic stay unchanged.

## 1. Typography: one serif, one sans

- **Serif for headings:** *Source Serif 4* (variable, optical sizing) for the app name, the intro headline and section titles.
- **Sans for everything else:** *Inter* (variable) for body text, controls, tables, KPI values and chart labels. Numbers stay sans with tabular figures in tables, so columns align.
- **Self-hosted:** install `@fontsource-variable/source-serif-4` and `@fontsource-variable/inter` at pinned versions. No requests to Google, and `font-display: swap` avoids invisible text.
- **Tailwind tokens:** `font-display` and `font-sans`, plus a type scale (`text-display`, `text-title`, `text-body`, `text-caption`).
- **Charts:** update the ECharts font constant so axes and tooltips use Inter.

## 2. Reference tiles

Three tiles at the top of the page, between the intro and the KPI strip. Each has a serif title, a few short points and a link into the app. They sit side by side on desktop and stack on phones. A "Hide" toggle collapses them, and the choice is remembered per viewer.

**i. Source data**
- GA4 obfuscated ecommerce sample (Google Merchandise Store), Nov 2020 – Jan 2021, event-level in BigQuery.
- Live counts from `/api/meta`: sessions, users, conversions, last refresh, and whether the build is real or synthetic.
- What's missing: ad spend, cross-device identity, and the obfuscated sources. Links to Data notes.

**ii. How it extends to other data**
- **Consumer data (CRM/CDP):** join journeys to customer IDs to see which channels acquire which segments.
- **Customer lifetime value (LTV):** credit repeat-purchase revenue to the first-touch channel, so channels are judged on lifetime value, not first order.
- **Marketing spend:** add ad cost by channel and campaign to get ROAS and CAC under each model.
- **Offline and retail:** add store visits or call-centre sales as touchpoints or conversions.

**iii. Who it helps**
- **CMO:** shift budget toward channels that start journeys, not just the ones that close them.
- **CFO:** back marketing spend with model-based revenue credit, and weigh CAC against LTV.
- **CEO:** see which growth levers actually drive revenue.
- **E-commerce and growth teams:** campaign and journey diagnostics for weekly decisions.
- **Data and analytics:** a reusable, tested attribution pipeline.

Tiles ii and iii describe possible uses, not features the app has today, and their wording says so ("could", "extends to"). The copy lives in one typed file (`web/src/content/reference.ts`), so it can change without touching layout. Only the source-data counts come from the API.

## 3. Section navigation chips

- **Pill row** under the filter bar: Overview, Channels, Attribution, Journeys, Campaigns, Data notes.
- **Each pill** is an anchor (`#overview`, `#channels` …) with smooth scrolling, turned off when the user prefers reduced motion.
- **Scrollspy:** an `IntersectionObserver` highlights the pill for the section in view and sets `aria-current="location"`.
- **Sticky on desktop.** On phones the row scrolls sideways with snap points and no visible scrollbar.
- **Keyboard:** Tab reaches each pill, with a visible focus ring.

## 4. Insight chips

Three data-driven chips in the intro card, each jumping to the section that backs it:

- "Direct gains most under Markov" → Attribution
- "Top journey: Organic Search → Purchase" → Journeys
- "Best campaign CVR" → Campaigns

They reuse queries the page already makes and are hidden while loading or empty.

## 5. Active-filter chips

When a filter differs from its default, a removable chip appears ("Dec 2020 ×", "Mobile ×"). Removing one resets that filter; "Clear all" resets everything. The current slice stays obvious while scrolling.

## 6. Visual refresh

- **Cards:** larger radius (16px), softer hairline borders, a subtle layered shadow in light mode, flat in dark mode.
- **Header:** translucent background with backdrop blur, using `color-mix()` on the existing tokens.
- **Spacing:** more vertical space between sections. Each section title gets a small eyebrow label ("02 · Channels").
- **Intro:** a bigger serif headline, the main button kept as is, and "View source" as a ghost button.
- **Shared Chip component:** default, active and removable variants from existing color tokens, so the validated channel palette stays untouched.

## 7. Accessibility and performance

- Contrast of at least 4.5:1 for text on chips, in both themes.
- Chip hit targets of at least 32px tall.
- Fonts subset to Latin.
- Main bundle growth kept under 15 KB gzip, excluding fonts.

## 8. Testing

- **Vitest:** reference tiles (source counts from mocked `/api/meta`, the hide toggle, links that point to real section ids), active-filter chips (render, remove one, clear all), the insight-chip builders, and the nav pills' anchors and `aria-current`.
- **Browser check:** desktop and phone, light and dark; scroll offsets clear the sticky header.
- **Regression:** existing tests, lint and type check pass.

## 9. Order of work

1. Fonts and type tokens
2. Shared Chip component
3. Reference tiles and their content file
4. Navigation pills with scrollspy
5. Active-filter chips
6. Insight chips
7. Visual polish
8. Tests and browser verification
9. Commit and open a PR

## Out of scope

New charts, API changes, routing, and palette changes. Housekeeping: add `web/.vite/` (Vitest's cache) to `.gitignore`.
