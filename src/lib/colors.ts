import type { MealType } from "@/api/types";

export const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "#FFE0B2",
  lunch: "#C8E6C9",
  dinner: "#D1C4E9",
  snack: "#FFCCBC",
};

export const MACRO_COLORS = {
  protein: "#E8837A",
  fat: "#E6B800",
  carbs: "#7EC8E3",
  fiber: "#9C7A54",
} as const;

export function darkenColor(hex: string, factor = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (channel: number) => Math.round(channel * (1 - factor));
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
}
