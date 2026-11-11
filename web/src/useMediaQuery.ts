import { useSyncExternalStore } from "react";

/** Live result of a CSS media query (false where matchMedia is unavailable). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia?.(query);
      mq?.addEventListener("change", onChange);
      return () => mq?.removeEventListener("change", onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

/** Chart heights per breakpoint: phones get shorter charts. */
export function useChartHeight(phone: number, desktop: number): number {
  return useMediaQuery("(min-width: 768px)") ? desktop : phone;
}
