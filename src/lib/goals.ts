import type { Goal, NutritionTotals } from "@/api/types";
import { parseDecimal } from "./format";

/** Whichever goal actually applies to a given date, from the full
 * goal history - a goal's own [start_date, end_date] range decides
 * this, not "whatever's currently active" (a goal scheduled to start
 * later, or one that already ended, both still apply to THEIR OWN
 * days when looking at a week that spans a transition). Returns
 * undefined if no goal covers that date at all (a genuine gap, or
 * before any goal existed). */
export function resolveGoalForDate(goals: Goal[], dateIso: string): Goal | undefined {
  return goals.find((g) => g.start_date <= dateIso && (g.end_date == null || g.end_date >= dateIso));
}

/** Sums each date's own applicable goal target - NOT one goal's daily
 * target multiplied by a day count (see design discussion: that broke
 * as soon as a goal could start mid-week, and also never made sense
 * for a week where fewer than all 7 days have "happened" yet, since
 * pre-tracking means the actual totals already reflect the WHOLE
 * week regardless of what day today is). Days with no applicable goal
 * contribute zero. */
export function sumGoalTargetsForWeek(goals: Goal[], dates: string[]): NutritionTotals {
  const totals: NutritionTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const date of dates) {
    const goal = resolveGoalForDate(goals, date);
    if (!goal) continue;
    totals.kcal += parseDecimal(goal.kcal_target);
    totals.protein_g += parseDecimal(goal.protein_g_target);
    totals.carbs_g += parseDecimal(goal.carbs_g_target);
    totals.fat_g += parseDecimal(goal.fat_g_target);
    totals.fiber_g += parseDecimal(goal.fiber_g_target);
  }
  return totals;
}