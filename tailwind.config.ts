import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core "clean water" teal — same family as before, extended for depth
        brand: {
          50: "#eefdf9",
          100: "#d3f8ee",
          200: "#a6efdd",
          300: "#6fe0c8",
          400: "#34c9a9",
          500: "#14b391",
          600: "#0a8f76",
          700: "#0a715f",
          800: "#0b5a4d",
          900: "#0d4740",
          950: "#072e29",
        },
        // Tech-forward aqua accent
        accent: {
          300: "#8fe3f7",
          400: "#4fcbec",
          500: "#1aa9d6",
          600: "#0d84b0",
          700: "#0c688c",
        },
        // Warm brass/gold — the "concierge" accent used sparingly for premium
        // touches (badges, ratings, small highlights), never as a base color
        gold: {
          200: "#f3e2b8",
          300: "#e8c887",
          400: "#d9ab56",
          500: "#c2903c",
          600: "#9c722e",
        },
        // Deep teal-tinted ink for dark surfaces — never pure black
        ink: {
          950: "#03110d",
          900: "#061b15",
          800: "#0a2921",
          700: "#0f372c",
          600: "#154536",
        },
        // Layered off-white surfaces (foam on foam, not one flat white)
        foam: {
          50: "#fbfdfc",
          100: "#f4faf8",
          200: "#eaf5f1",
        },
        surface: "#f4faf8",
      },
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0a8f76 0%, #1aa9d6 100%)",
        "mesh-1":
          "radial-gradient(circle at 15% 18%, rgba(20,179,145,0.32), transparent 42%), radial-gradient(circle at 82% 12%, rgba(217,171,86,0.26), transparent 45%), radial-gradient(circle at 65% 70%, rgba(111,224,200,0.34), transparent 48%), radial-gradient(circle at 10% 85%, rgba(79,203,236,0.24), transparent 50%)",
        "mesh-dark":
          "radial-gradient(circle at 20% 20%, rgba(20,179,145,0.30), transparent 45%), radial-gradient(circle at 85% 30%, rgba(79,203,236,0.22), transparent 50%), radial-gradient(circle at 50% 90%, rgba(10,143,118,0.35), transparent 55%)",
      },
      boxShadow: {
        "tint-sm": "0 8px 24px -12px rgba(10,113,95,0.35)",
        tint: "0 20px 60px -24px rgba(6,27,21,0.45)",
        "tint-lg": "0 32px 80px -20px rgba(6,27,21,0.55)",
        glass:
          "inset 0 1px 0 rgba(255,255,255,0.5), 0 20px 60px -30px rgba(6,27,21,0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
