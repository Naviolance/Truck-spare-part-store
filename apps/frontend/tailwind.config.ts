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
        // Redesign step 1 surfaces: cards sit on paper, photos on sand.
        card: "#FFFDF8",
        line: "#DAD3C6",
        sand: "#E9E3D8",
        skeleton: "#E4DDD0",
        // Text/borders on the dark (ink) header and hero.
        "ink-soft": "#2C2925",
        "paper-dim": "#CFC8BA",
        // Stock: green for available (the only green on the site).
        stock: { DEFAULT: "#2F6B3A", bg: "#E3EDDF" },
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
