import type { ReactNode } from "react";
import { hueStyle, type Hue } from "../sections";

const base =
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors";
const plain = "border-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink";
const tinted = "text-ink hover:brightness-[0.97]";

interface ChipLinkProps {
  href: string;
  children: ReactNode;
  /** Section pastel. Tints the chip when `active` (or always, with `tint`). */
  hue?: Hue;
  active?: boolean;
  tint?: boolean;
  icon?: ReactNode;
  className?: string;
  "aria-current"?: "location" | undefined;
}

/** A pill that navigates within the page. */
export function ChipLink({ href, children, hue, active = false, tint = false, icon, className = "", ...rest }: ChipLinkProps) {
  const filled = hue && (active || tint);
  return (
    <a
      href={href}
      className={`${base} ${filled ? tinted : plain} ${active ? "font-semibold" : ""} snap-start ${className}`}
      style={filled ? hueStyle(hue) : undefined}
      {...rest}
    >
      {icon}
      {children}
    </a>
  );
}

/** The small pastel dot that ties a chip or label to its section. */
export function HueDot({ hue }: { hue: Hue }) {
  return <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--hue-${hue}-edge)` }} />;
}

interface RemovableChipProps {
  label: string;
  onRemove: () => void;
}

/** A pill describing an active filter, with a button that clears it. */
export function RemovableChip({ label, onRemove }: RemovableChipProps) {
  return (
    <span className={`${base} ${plain} pr-1`}>
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
