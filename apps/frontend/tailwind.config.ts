import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Industrial parts-catalog palette - see design plan: warm
        // near-black/off-white base, one amber accent used sparingly,
        // rust and steel carry real meaning (condition grading) rather
        // than decorating.
        ink: "#1B1917",
        paper: "#F3EFE7",
        amber: { DEFAULT: "#E8A33D", dark: "#8B5A1F" },
        rust: { DEFAULT: "#A8462F", dark: "#8A3821" },
        steel: { DEFAULT: "#4A5560", light: "#E4E7E9" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        fadeIn: "fadeIn 0.15s ease-out",
        scaleIn: "scaleIn 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
