import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Page / content backgrounds
        surface: "#F8F8F7",

        // Sidebar theme (near-black)
        sidebar: {
          DEFAULT: "#0A0A0A",
          hover: "#141414",
          active: "#1C1C1C",
          border: "#1F1F1F",
          muted: "#6A6A6A",
          text: "#E8E8E6",
        },

        // Primary action / accent (electric blue)
        accent: {
          50:   "#EEF3FF",
          100:  "#DCE8FF",
          200:  "#B8CFFF",
          500:  "#3B6EF8",
          600:  "#2B5EE8",
          700:  "#1B4ED8",
          navy: "#1E3A5F",
        },

        // Text / ink scale
        ink: {
          DEFAULT:   "#1A1A1A",
          secondary: "#4A4A4A",
          muted:     "#7A7A7A",
          faint:     "#A8A8A6",
        },

        // Border tokens
        border: {
          DEFAULT: "#EBEBEA",
          medium:  "#E0DFDB",
          strong:  "#C8C7C3",
        },

        // Semantic
        success: {
          DEFAULT: "#16A34A",
          bg:      "#F0FDF4",
          border:  "#BBF7D0",
          text:    "#15803D",
        },
        warning: {
          DEFAULT: "#D97706",
          bg:      "#FFFBEB",
          border:  "#FDE68A",
          text:    "#B45309",
        },
        danger: {
          DEFAULT: "#DC2626",
          bg:      "#FEF2F2",
          border:  "#FECACA",
          text:    "#B91C1C",
        },
      },

      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },

      boxShadow: {
        card:        "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover":"0 4px 16px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)",
        panel:       "0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
