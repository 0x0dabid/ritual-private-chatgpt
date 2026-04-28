import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "ritual-green": "#2F795A",
        "ritual-paper": "#F5F0E8",
        "ritual-dark": "#1a1a1a",
        "ritual-muted": "#6B7280",
      },
    },
  },
  plugins: [],
};

export default config;
