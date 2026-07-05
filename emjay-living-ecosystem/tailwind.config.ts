import type { Config } from "tailwindcss";

/**
 * Emjay palette — the studio's real eucalyptus-teal brand, warmed.
 * Anchored on Emjay's actual brand teal (#609E9F family) and softened with a
 * warm oat ground and a dusty-rose accent so it reads calm and *warm* rather
 * than clinical — feminine-but-not-twee, for a midlife nervous-system brand.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutral ground (the "warm" in the brief)
        oat: {
          50: "#FBF8F3",
          100: "#F5EFE6",
          200: "#EBE1D3",
          300: "#DCCDB9",
        },
        // Primary — Emjay eucalyptus teal (from the brand document)
        eucalyptus: {
          50: "#EDF4F4",
          100: "#DBE8E9",
          200: "#B1CFCF",
          300: "#87B5B6",
          400: "#609E9F",
          500: "#4F8788",
          600: "#3F6C6D",
          700: "#325658",
        },
        // Muted sage — supporting green
        sage: {
          100: "#E4E8DE",
          200: "#C7D1BC",
          300: "#A6B597",
          400: "#87997A",
          500: "#6B7D5F",
          600: "#535F4A",
        },
        // Dusty rose / blush accent (warmth + feminine)
        blush: {
          100: "#F5E5E1",
          200: "#E9CBC4",
          300: "#D8A7A0",
          400: "#C68A82",
        },
        // Deep eucalyptus-charcoal ink for text
        ink: {
          DEFAULT: "#2C3A38",
          soft: "#4E5C5A",
          muted: "#7C8785",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(59,46,56,0.04), 0 8px 24px -12px rgba(59,46,56,0.14)",
        lift: "0 2px 6px rgba(59,46,56,0.06), 0 18px 40px -20px rgba(59,46,56,0.22)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.08)", opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
