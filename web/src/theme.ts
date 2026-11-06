import { createContext, useContext, useEffect, useState } from "react";

export type Mode = "light" | "dark";

export const ModeContext = createContext<Mode>("light");

/** Chart palette for the resolved color mode. */
export function useChartTheme(): ChartTheme {
  return THEMES[useContext(ModeContext)];
}

// Categorical slots in fixed order, one per channel (validated for CVD
// separation in both modes). Color follows the channel, never its rank.
const CHANNEL_SLOTS: Record<string, Record<Mode, string>> = {
  "Organic Search": { light: "#2a78d6", dark: "#3987e5" },
  "Paid Search": { light: "#eb6834", dark: "#d95926" },
  Direct: { light: "#1baf7a", dark: "#199e70" },
  Referral: { light: "#eda100", dark: "#c98500" },
  Email: { light: "#e87ba4", dark: "#d55181" },
  "Other / Unknown": { light: "#6250d6", dark: "#9085e9" },
};

export const CHANNELS = Object.keys(CHANNEL_SLOTS);

export interface ChartTheme {
  mode: Mode;
  surface: string;
  text: string;
  textSecondary: string;
  muted: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  purchase: string;
  // Attribution models: three heuristics recede in grays, Markov is the accent.
  models: Record<"last_click" | "first_click" | "linear" | "markov", string>;
  spark: string;
}

const THEMES: Record<Mode, ChartTheme> = {
  light: {
    mode: "light",
    surface: "#fcfcfb",
    text: "#0b0b0b",
    textSecondary: "#52514e",
    muted: "#6f6d68",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    tooltipBg: "#ffffff",
    tooltipBorder: "rgba(11,11,11,0.10)",
    purchase: "#0b0b0b",
    models: { last_click: "#52514e", first_click: "#898781", linear: "#c3c2b7", markov: "#008300" },
    spark: "#52514e",
  },
  dark: {
    mode: "dark",
    surface: "#1a1a19",
    text: "#f0efec",
    textSecondary: "#c3c2b7",
    muted: "#a3a29b",
    grid: "#2c2c2a",
    axis: "#383835",
    tooltipBg: "#232321",
    tooltipBorder: "rgba(255,255,255,0.10)",
    purchase: "#f0efec",
    models: { last_click: "#c3c2b7", first_click: "#898781", linear: "#52514e", markov: "#0ca30c" },
    spark: "#c3c2b7",
  },
};

export const MODEL_LABELS = {
  last_click: "Last click",
  first_click: "First click",
  linear: "Linear",
  markov: "Markov",
} as const;

export function chartTheme(mode: Mode): ChartTheme {
  return THEMES[mode];
}

export function channelColor(channel: string, mode: Mode): string {
  return CHANNEL_SLOTS[channel]?.[mode] ?? THEMES[mode].muted;
}

const STORAGE_KEY = "attr-dash-theme";

function readStored(): Mode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function systemMode(): Mode {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Resolved color mode: explicit user choice wins, otherwise follows the OS. */
export function useColorMode(): [Mode, (m: Mode) => void] {
  const [choice, setChoice] = useState<Mode | null>(readStored);
  const [system, setSystem] = useState<Mode>(systemMode);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const mode = choice ?? system;
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  const set = (m: Mode) => {
    setChoice(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // storage unavailable: the choice still applies for this visit
    }
  };
  return [mode, set];
}
