import { useMemo } from "react";

export interface SortState<K extends string> {
  key: K;
  dir: "asc" | "desc";
}

export function sortRows<T, K extends string>(rows: T[], sort: SortState<K>): T[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sort.key];
    const bv = (b as Record<string, unknown>)[sort.key];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return String(av).localeCompare(String(bv)) * factor;
  });
}

export function useSort<T, K extends string>(rows: T[], sort: SortState<K>): T[] {
  return useMemo(() => sortRows(rows, sort), [rows, sort]);
}

interface SortHeaderProps<K extends string> {
  col: K;
  label: string;
  numeric: boolean;
  sort: SortState<K>;
  onSort: (s: SortState<K>) => void;
}

export function SortHeader<K extends string>({ col, label, numeric, sort, onSort }: SortHeaderProps<K>) {
  const active = sort.key === col;
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={ariaSort} className={`py-2 font-medium ${numeric ? "pl-3 text-right" : "pr-2"}`}>
      <button
        type="button"
        onClick={() =>
          onSort({ key: col, dir: active ? (sort.dir === "asc" ? "desc" : "asc") : numeric ? "desc" : "asc" })
        }
        className={`inline-flex items-center gap-1 rounded hover:text-ink ${active ? "text-ink" : ""}`}
      >
        {label}
        <span aria-hidden className={`text-[10px] ${active ? "opacity-100" : "opacity-0"}`}>
          {sort.dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}
