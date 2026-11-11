# Touchline: next steps

Branch: `feature/next-steps` (from `main` at `9d7cef3`). Eight features, in suggested build order.

## i. Title: "Touchline by Anders Kiss"

Header, browser tab and README title. "Anders Kiss" keeps its GitHub link.

## ii. Sankey in the first viewport, condensed top

Visitors should see the journey Sankey, at least partly, without scrolling, on desktop (1440×900) and phone (375×812).

- **Hero Sankey preview:** the intro becomes two columns. The left keeps the headline, one-sentence pitch, button and insight chips. The right is a compact Sankey (top 8 journeys, about 260px tall) with "Explore all journeys →" linking to 04 · Journeys. On phones it sits directly under the headline. It reuses the existing Sankey chart and query, so there's no extra request.
- **Two-row header:** title, nav pills and actions on row one; compact filters on row two, with field labels moved into the controls (still labelled for screen readers). Target height 110px, down from 197px.
- **Reference tiles collapsed by default:** a slim strip of three summary chips ("i · Source data · 360K sessions", "ii · How it extends", "iii · Who it helps"). Each opens its tile in place. A visitor's choice is remembered.
- **Tighter intro:** shorter copy and smaller padding.
- **Measured, not eyeballed:** a browser check asserts the preview's top edge is inside the first viewport at both sizes.

## iii. Unified pastel color scheme

- **Section hues:** each section gets one pastel (sky, mint, lavender, peach, butter, rose). It tints that section's nav pill when active, its eyebrow dot, the matching tile chip and its insight chips.
- **Kept apart from data colors:** pastels are UI decoration only. The validated channel palette stays the only way charts encode data, so no section color can be mistaken for a channel.
- **Tokens:** `--hue-*` for light mode, with deeper, muted steps for dark mode. Text on every tint is checked for at least 4.5:1 contrast.

## iv. Modern responsive layout

- **Container queries:** cards adapt to their own width, not just the screen's. The KPI grid goes from 6 columns to 3 to 2, and tables become stacked rows below 440px (built: 560px stacked the desktop channel table, whose card is ~500px wide).
- **Compact mobile header:** filters move into a slide-up sheet behind a "Filters (2)" button, so the header and nav pills can stay sticky on phones.
- **Breakpoints:** 360 / 640 / 1024 / 1440px with per-breakpoint chart heights, plus `prefers-contrast` and print styles.

## v. Basic statistics for sections 01 and 03

- **01 · Overview:**
  - **Month-over-month % change** on every KPI card.
  - **Standard deviation** of the daily values, shown as "±σ" plus a shaded band on the sparkline.
  - **Coefficient of variation:** how volatile each metric is.
- **03 · Attribution:**
  - **Model spread:** per channel, the standard deviation across the four models, showing how much the models disagree.
  - **Change versus last-click:** the % change under each model.
- **Year-over-year:** the sample covers only Nov 2020 – Jan 2021, so YoY reads "needs 13+ months" until a longer extract exists. The API computes it once the data allows.

## vi. Data-driven attribution (Shapley values)

A fifth model that splits credit by each channel's marginal contribution across journeys. Shown next to Markov, with a test that it also sums to total conversions.

## vii. Export and share

PNG download for every chart, CSV for every table (not only campaigns), and a "Copy link" button that shares the current filters and section.

## viii. Performance

- **Smaller first load:** split out ECharts' heavier pieces, and render below-the-fold sections on scroll. The hero Sankey loads straight away. Target: under 180 KB gzip.
- **Fonts and budget:** preload both fonts, and fail CI below a Lighthouse performance score of 90.

## Testing and delivery

Each feature gets tests, a phone and desktop browser check in both themes, and its own commit. Items i–v ship in one PR, vi–viii in a second.
