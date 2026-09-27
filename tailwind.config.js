/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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