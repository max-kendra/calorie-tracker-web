/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral (non-blue) replacement for Tailwind's default gray
        // scale. The stock scale carries a strong blue undertone that
        // read as harsh in dark mode.
        gray: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#0c0c0e",
        },
        meal: {
          breakfast: "#FFE0B2",
          "breakfast-dark": "#4A3418",
          lunch: "#C8E6C9",
          "lunch-dark": "#28402A",
          dinner: "#D1C4E9",
          "dinner-dark": "#352D4A",
          snack: "#FFCCBC",
          "snack-dark": "#4A2E24",
        },
        macro: {
          protein: "#E8837A",
          fat: "#E6B800",
          carbs: "#7EC8E3",
          fiber: "#9C7A54",
        },
      },
    },
  },
  plugins: [],
};