import type { NutritionTotals } from "@/api/types";
import { MACRO_COLORS } from "@/lib/colors";
import { MacroBar } from "./MacroBar";

interface WeekMacroSummaryProps {
  weekTotals: NutritionTotals;
  /** Pre-summed - see lib/goals.ts's sumGoalTargetsForWeek. Each day's
   * OWN applicable goal already resolved and added in, not one goal's
   * daily target multiplied by a day count. */
  targetTotals: NutritionTotals;
}

export function WeekMacroSummary({ weekTotals, targetTotals }: WeekMacroSummaryProps) {
  const kcalGoal = Math.round(targetTotals.kcal);
  const proteinGoal = Math.round(targetTotals.protein_g);
  const carbsGoal = Math.round(targetTotals.carbs_g);
  const fatGoal = Math.round(targetTotals.fat_g);
  const fiberGoal = Math.round(targetTotals.fiber_g);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">This week</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {weekTotals.kcal} / {kcalGoal} Cal
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mt-3">
        <MacroBar label="Protein" eaten={weekTotals.protein_g} goal={proteinGoal} color={MACRO_COLORS.protein} />
        <MacroBar label="Fat" eaten={weekTotals.fat_g} goal={fatGoal} color={MACRO_COLORS.fat} />
        <MacroBar label="Carbs" eaten={weekTotals.carbs_g} goal={carbsGoal} color={MACRO_COLORS.carbs} />
        <MacroBar label="Fiber" eaten={weekTotals.fiber_g} goal={fiberGoal} color={MACRO_COLORS.fiber} />
      </div>
    </div>
  );
}