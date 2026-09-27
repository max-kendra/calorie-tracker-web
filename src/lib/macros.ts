import type { Log, MealType, NutritionTotals } from "@/api/types";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export const ZERO_TOTALS: NutritionTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

export function addTotals(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: a.fiber_g + b.fiber_g,
  };
}

export function logTotals(log: Log): NutritionTotals {
  return {
    kcal: log.kcal_logged,
    protein_g: log.protein_g_logged,
    carbs_g: log.carbs_g_logged,
    fat_g: log.fat_g_logged,
    fiber_g: log.fiber_g_logged,
  };
}

export function sumTotals(logs: Log[]): NutritionTotals {
  return logs.reduce((acc, log) => addTotals(acc, logTotals(log)), ZERO_TOTALS);
}

export function groupByDateAndMeal(logs: Log[], dates: string[]): Record<string, Record<MealType, Log[]>> {
  const result: Record<string, Record<MealType, Log[]>> = {};
  for (const date of dates) {
    result[date] = { breakfast: [], lunch: [], dinner: [], snack: [] };
  }
  for (const log of logs) {
    const day = result[log.date];
    if (day) {
      day[log.meal_type].push(log);
    }
  }
  return result;
}

export function logDisplayName(log: Log): string {
  return log.item_name ?? log.recipe_name ?? "Unknown";
}

/** "2 slices (60g)" - shared by log display and recipe ingredient
 * display (see design discussion: "when we display quantity everywhere
 * else in the web ui, if it's a custom serving, we should display how
 * many grams it is in parantheses afterwards"). Plain grams (no
 * serving) just shows "60g" with no suffix - there's nothing to
 * disambiguate there. */
export function servingQuantityLabel(
  quantity: string,
  servingSizeName: string | null,
  servingSizeWeightG: string | null,
): string {
  const quantityNum = parseFloat(quantity);
  const quantityDisplay = String(quantityNum);
  if (servingSizeName) {
    const weightG = servingSizeWeightG ? parseFloat(servingSizeWeightG) : null;
    const gramsSuffix = weightG != null ? ` (${Math.ceil(quantityNum * weightG)}g)` : "";
    return `${quantityDisplay} ${servingSizeName}${gramsSuffix}`;
  }
  return `${Math.ceil(quantityNum)}g`;
}

export function logQuantityLabel(log: Log): string {
  if (log.recipe_id != null) {
    const quantity = parseFloat(log.quantity);
    return `${String(quantity)} ${quantity === 1 ? "serving" : "servings"}`;
  }
  return servingQuantityLabel(log.quantity, log.serving_size_name, log.serving_size_weight_g);
}