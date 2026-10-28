import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
          border: "var(--surface-border)",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        ce: {
          DEFAULT: "#10b981", // Emerald / Green for Call Options
          light: "#34d399",
          dark: "#059669",
          bg: "rgba(16, 185, 129, 0.08)",
          border: "rgba(16, 185, 129, 0.25)",
        },
        pe: {
          DEFAULT: "#ef4444", // Rose / Red for Put Options
          light: "#f87171",
          dark: "#dc2626",
          bg: "rgba(239, 68, 68, 0.08)",
          border: "rgba(239, 68, 68, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
