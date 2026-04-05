import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      colors: {
        sage: {
          50: "#F8FAF8",
          100: "#E8EDE8",
          200: "#D1DDD1",
          300: "#B5C7B5",
          400: "#8B9D83",
          500: "#6B7D63",
          600: "#556350",
          700: "#3D4838",
        },
        lavender: {
          100: "#EDE8F5",
          200: "#D8CCE8",
          300: "#B8A8D9",
          400: "#9B85C4",
        },
      },
    },
  },
  plugins: [],
}

export default config
