import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        navProgress: {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(20%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.15s ease-out",
        scaleIn: "scaleIn 0.15s ease-out",
        navProgress: "navProgress 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
