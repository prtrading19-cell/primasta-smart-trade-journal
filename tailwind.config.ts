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
        ink: "hsl(var(--ink))",
        profit: "hsl(var(--profit))",
        loss: "hsl(var(--loss))",
        warning: "hsl(var(--gold))",
        gold: "hsl(var(--gold))",
        "gold-dim": "hsl(var(--gold-dim))",
        surface: {
          base: "hsl(var(--surface-base))",
          card: "hsl(var(--surface-card))",
          panel: "hsl(var(--surface-panel))",
          elevated: "hsl(var(--surface-elevated))",
          hover: "hsl(var(--surface-hover))"
        },
        border: {
          subtle: "hsl(var(--border-subtle))",
          DEFAULT: "hsl(var(--border))",
          emphasis: "hsl(var(--border-emphasis))"
        },
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-muted": "hsl(var(--text-muted))"
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
