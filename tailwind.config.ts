import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// DOT design tokens.
//
// Every existing component already reads colors through these same token
// names (brand / accent / gold / ink / foam) rather than literal hex values,
// so redefining the palette here re-skins the whole application — nav,
// buttons, cards, badges, gradients — without touching individual page
// files. That's deliberate: this is the "visual system" pass, not a
// page-by-page rewrite.
//
// Palette logic:
// - foam  = the warm neutral surface family (page background -> secondary
//   surface -> hairline tone), replacing the old mint-tinted whites.
// - ink   = the near-black neutral family used for text and dark sections,
//   replacing the old teal-tinted dark.
// - brand = the single "signal" accent (a restrained amber/bronze, not a
//   second teal or a generic SaaS blue/purple) used sparingly: the DOT
//   mark, active states, links, small status dots.
// - gold  = a slightly softer tint of the same accent family, kept as a
//   separate token only because a handful of components already reference
//   `gold-*` for quiet eyebrow labels — visually it now reads as one
//   accent family, not two competing colors.
// - accent = repurposed from a second bright hue into a neutral warm-grey
//   scale, used only where the app previously paired brand with a second
//   color (e.g. gradient text) — so that pairing becomes amber -> graphite
//   instead of teal -> aqua.
// ---------------------------------------------------------------------------

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // The DOT signal accent — warm bronze/amber. Used selectively: the
        // brand mark, active nav state, links, small status indicators.
        // Never a background, never a gradient base.
        brand: {
          50: "#fbf4e9",
          100: "#f4e4c9",
          200: "#e8c99a",
          300: "#dbac6d",
          400: "#ce9049",
          500: "#c07a33",
          600: "#a2652a",
          700: "#815127",
          800: "#664224",
          900: "#54371f",
          950: "#2d1c10",
        },
        // Repurposed: a neutral warm-grey scale (not a second hue) for the
        // rare spot that previously paired the accent with a second color.
        accent: {
          300: "#c2beb2",
          400: "#a29c8c",
          500: "#827c6c",
          600: "#615c4e",
          700: "#454136",
        },
        // Softer tint of the same accent, kept for existing `gold-*` call
        // sites (quiet eyebrow labels / premium touches).
        gold: {
          200: "#ecdcbb",
          300: "#e1c491",
          400: "#cea25e",
          500: "#b3823d",
          600: "#8f6830",
        },
        // Near-black neutral, warm-toned (never pure black, never teal).
        ink: {
          950: "#0b0c0d",
          900: "#17191b",
          800: "#212325",
          700: "#2b2d2f",
          600: "#4a4d50",
        },
        // Warm off-white / soft ivory surfaces.
        foam: {
          50: "#f5f4f0",
          100: "#ecebe6",
          200: "#d9d8d2",
        },
        surface: "#f5f4f0",
      },
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.375rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #a2652a 0%, #615c4e 100%)",
        // Near-invisible tonal vignettes rather than colored blobs — the
        // "atmospheric field" the DOT background system calls for. Detail
        // (the actual dot/line network) is drawn by <DotField>; this is
        // just faint depth behind it.
        "mesh-1":
          "radial-gradient(circle at 12% 8%, rgba(23,25,27,0.05), transparent 40%), radial-gradient(circle at 88% 18%, rgba(192,122,51,0.06), transparent 42%), radial-gradient(circle at 70% 92%, rgba(23,25,27,0.045), transparent 50%)",
        "mesh-dark":
          "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.045), transparent 45%), radial-gradient(circle at 82% 30%, rgba(206,144,73,0.10), transparent 50%), radial-gradient(circle at 50% 95%, rgba(255,255,255,0.03), transparent 55%)",
      },
      boxShadow: {
        "tint-sm": "0 1px 2px rgba(17,19,21,0.05), 0 10px 24px -16px rgba(17,19,21,0.18)",
        tint: "0 24px 60px -30px rgba(17,19,21,0.28)",
        "tint-lg": "0 36px 84px -24px rgba(17,19,21,0.34)",
        glass:
          "inset 0 1px 0 rgba(255,255,255,0.5), 0 24px 60px -34px rgba(17,19,21,0.22)",
      },
      backdropBlur: {
        xs: "2px",
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
    },
  },
  plugins: [],
};

export default config;
