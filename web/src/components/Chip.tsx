import type { ReactNode } from "react";

const base =
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors";
const tones = {
  default: "border-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink",
  active: "border-transparent bg-[var(--chip-active-bg)] text-[var(--chip-active-text)]",
} as const;

interface ChipLinkProps {
  href: string;
  children: ReactNode;
  active?: boolean;
  icon?: ReactNode;
  className?: string;
  "aria-current"?: "location" | undefined;
}

/** A pill that navigates within the page. */
export function ChipLink({ href, children, active = false, icon, className = "", ...rest }: ChipLinkProps) {
  return (
    <a href={href} className={`${base} ${active ? tones.active : tones.default} snap-start ${className}`} {...rest}>
      {icon}
      {children}
    </a>
  );
}

interface RemovableChipProps {
  label: string;
  onRemove: () => void;
}

/** A pill describing an active filter, with a button that clears it. */
export function RemovableChip({ label, onRemove }: RemovableChipProps) {
  return (
    <span className={`${base} ${tones.default} pr-1`}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}
