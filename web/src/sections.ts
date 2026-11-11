// In-page sections, in page order. Drives the nav pills, eyebrow labels and
// every chip that links into the app, so anchors can't drift from the page.
// Each section owns a pastel hue: UI decoration only, never a data encoding
// (charts keep the validated channel palette).
export const HUES = ["sky", "mint", "lavender", "peach", "butter", "rose"] as const;
export type Hue = (typeof HUES)[number];

export const SECTIONS = [
  { id: "overview", label: "Overview", hue: "sky" },
  { id: "channels", label: "Channels", hue: "mint" },
  { id: "attribution", label: "Attribution", hue: "lavender" },
  { id: "paths", label: "Journeys", hue: "peach" },
  { id: "campaigns", label: "Campaigns", hue: "butter" },
  { id: "data-notes", label: "Data notes", hue: "rose" },
] as const satisfies readonly { id: string; label: string; hue: Hue }[];

export type SectionId = (typeof SECTIONS)[number]["id"];

export const sectionHref = (id: SectionId) => `#${id}`;

export function hueFor(id: SectionId): Hue {
  return SECTIONS.find((s) => s.id === id)!.hue;
}

/** Inline style for a pastel surface: tinted fill and a slightly deeper edge. */
export function hueStyle(hue: Hue): { background: string; borderColor: string } {
  return { background: `var(--hue-${hue})`, borderColor: `var(--hue-${hue}-edge)` };
}

/** "02 · Channels" */
export function eyebrowFor(id: string): string | null {
  const i = SECTIONS.findIndex((s) => s.id === id);
  return i < 0 ? null : `${String(i + 1).padStart(2, "0")} · ${SECTIONS[i].label}`;
}
