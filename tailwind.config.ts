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
        profit: "#16a34a",
        loss: "#dc2626",
        warning: "#f59e0b"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
