import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        accent: {
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        surface: "#f7faf9",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-manrope)", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #059669 0%, #0ea5e9 100%)",
        "mesh-1":
          "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.18), transparent 45%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.16), transparent 45%), radial-gradient(circle at 50% 80%, rgba(16,185,129,0.12), transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
