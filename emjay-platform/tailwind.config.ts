import type { Config } from "tailwindcss";

/**
 * Emjay Platform palette.
 * Built from the brand's named colours: deep teal, soft teal, pale aqua,
 * warm ivory, soft sand, text grey. Calm, warm, premium, grown-up. No neon,
 * no generic wellness purple, no clinical white-and-blue.
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
        // Warm ivory ground
        ivory: {
          50: "#FBF8F3",
          100: "#F5EFE6",
          200: "#EEE6D8",
        },
        // Soft sand — warm neutral for cards, borders, sections
        sand: {
          100: "#EFE7DA",
          200: "#E3D7C4",
          300: "#D3C3A9",
        },
        // Teal — the brand spine. 100 = pale aqua, 400 = soft teal, 600 = deep teal
        teal: {
          50: "#EDF4F4",
          100: "#DBE8E9",
          200: "#B1CFCF",
          300: "#87B5B6",
          400: "#609E9F",
          500: "#4C8788",
          600: "#396B6C",
          700: "#2C5556",
        },
        // Warm clay accent — used sparingly for warmth, never pink/twee
        clay: {
          100: "#F1E3D6",
          200: "#E6CDB6",
          300: "#CE9F79",
          400: "#B37E56",
        },
        // Text greys with a warm-teal undertone
        ink: {
          DEFAULT: "#2F3B39",
          soft: "#51605D",
          muted: "#7E8B88",
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
        soft: "0 1px 2px rgba(47,59,57,0.04), 0 8px 24px -12px rgba(47,59,57,0.12)",
        lift: "0 2px 6px rgba(47,59,57,0.05), 0 18px 40px -20px rgba(47,59,57,0.20)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        // Slow and gentle only. No fast, flashing, or attention-grabbing motion.
        breathe: "breathe 7s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
