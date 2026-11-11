import { useLayoutEffect, useRef } from "react";
import { useMeta } from "../queries";
import type { Mode } from "../theme";
import { ActiveFilters } from "./ActiveFilters";
import { APP_NAME, AUTHOR } from "./Credit";
import { FilterControls, FilterSheet } from "./FilterControls";
import { SectionNav, useActiveSection } from "./SectionNav";

interface HeaderProps {
  mode: Mode;
  onModeChange: (m: Mode) => void;
}

export function Header({ mode, onModeChange }: HeaderProps) {
  const meta = useMeta();
  const active = useActiveSection();
  const ref = useHeaderHeightVar();

  return (
    <header ref={ref} className="header-glass sticky top-0 z-20 border-b border-hairline">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        {/* Row 1: title, section pills (desktop), actions */}
        <div className="flex h-14 items-center gap-3 md:gap-4">
          <h1 className="min-w-0 shrink-0 whitespace-nowrap font-display text-xl font-semibold tracking-tight text-ink md:text-2xl">
            {APP_NAME}{" "}
            <span className="font-sans text-sm font-normal tracking-normal text-ink-2">
              by{" "}
              <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline-offset-4 hover:underline">
                {AUTHOR.name}
              </a>
            </span>
          </h1>
          {meta.data?.source === "synthetic" && (
            <span className="hidden whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2 sm:inline">
              synthetic data
            </span>
          )}
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <SectionNav active={active} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <div className="md:hidden">
              <FilterSheet />
            </div>
            <button
              type="button"
              onClick={() => onModeChange(mode === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {mode === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: filters + active-filter chips (desktop); section pills (phones) */}
        <div className="flex min-h-[3rem] items-center gap-3 border-t border-hairline py-1.5">
          <div className="hidden flex-1 items-center justify-between gap-3 md:flex">
            <FilterControls layout="inline" />
            <ActiveFilters />
          </div>
          <div className="min-w-0 flex-1 md:hidden">
            <SectionNav active={active} />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Publishes the header's height as --header-h, so in-page anchors scroll to
 * just below it.
 */
function useHeaderHeightVar() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => {
      const sticky = getComputedStyle(el).position === "sticky";
      root.style.setProperty("--header-h", sticky ? `${el.offsetHeight}px` : "0px");
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return ref;
}
