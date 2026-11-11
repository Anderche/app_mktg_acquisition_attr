import containerQueries from "@tailwindcss/container-queries";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
    },
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        ink: "var(--text-primary)",
        "ink-2": "var(--text-secondary)",
        muted: "var(--text-muted)",
        hairline: "var(--hairline)",
        border: "var(--border)",
        good: "var(--delta-good)",
        bad: "var(--delta-bad)",
        accent: "var(--accent)",
      },
      fontFamily: {
        // Serif is for headings only; numbers, tables and charts stay sans.
        display: ['"Source Serif 4 Variable"', "Georgia", '"Times New Roman"', "serif"],
        sans: ['"Inter Variable"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      fontSize: {
        display: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        title: ["1.375rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        body: ["0.9375rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [containerQueries],
};
