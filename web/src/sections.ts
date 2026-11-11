// In-page sections, in page order. Drives the nav pills, eyebrow labels and
// every chip that links into the app, so anchors can't drift from the page.
export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "channels", label: "Channels" },
  { id: "attribution", label: "Attribution" },
  { id: "paths", label: "Journeys" },
  { id: "campaigns", label: "Campaigns" },
  { id: "data-notes", label: "Data notes" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const sectionHref = (id: SectionId) => `#${id}`;

/** "02 · Channels" */
export function eyebrowFor(id: string): string | null {
  const i = SECTIONS.findIndex((s) => s.id === id);
  return i < 0 ? null : `${String(i + 1).padStart(2, "0")} · ${SECTIONS[i].label}`;
}
