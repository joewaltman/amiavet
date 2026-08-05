import type { Config } from "tailwindcss";

// Amia brand palette. Keep these in sync with the marketing site.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          DEFAULT: "#1F6F5C", // primary sage/teal
          dark: "#175646",
          soft: "#E7F0EC",
        },
        cream: "#FBF9F4",
        charcoal: "#1A1A2E",
        muted: "#55566A",
        terracotta: {
          DEFAULT: "#C2410C",
          soft: "#FBEDE4",
        },
        hairline: "#ECE7DD",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,26,46,.04), 0 2px 8px rgba(26,26,46,.05)",
        card: "0 4px 12px rgba(26,26,46,.06), 0 12px 32px rgba(26,26,46,.07)",
      },
    },
  },
  plugins: [],
};

export default config;
