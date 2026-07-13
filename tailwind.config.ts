import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        profit: "#16C784",
        loss: "#EA3943",
        warning: "#D4AF37",
        gold: "#D4AF37",
        "gold-dim": "#B8960F",
        surface: {
          base: "#05070A",
          card: "#0F172A",
          panel: "#111827",
          elevated: "#1A2332",
          hover: "#1E293B"
        },
        border: {
          subtle: "#1E293B",
          DEFAULT: "#253244",
          emphasis: "#334155"
        },
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        "text-muted": "#64748B"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(212, 175, 55, 0.1)",
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.4)"
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
