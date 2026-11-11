import { useEffect, useState } from "react";
import { SECTIONS, sectionHref, type SectionId } from "../sections";
import { ChipLink } from "./Chip";

/** The section currently in the reading band (just below the sticky header). */
export function useActiveSection(): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = SECTIONS.find((s) => visible.get(s.id));
        if (first) setActive(first.id);
      },
      // A thin band ~30% down the viewport decides which section is "current".
      { rootMargin: "-30% 0px -65% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export function SectionNav({ active }: { active: SectionId | null }) {
  return (
    <nav aria-label="Sections" className="min-w-0">
      <ul className="scrollbar-none -mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 py-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <ChipLink href={sectionHref(s.id)} active={active === s.id} aria-current={active === s.id ? "location" : undefined}>
              {s.label}
            </ChipLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
