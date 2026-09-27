export interface MacroRatio {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Matches the Android app's own MacronutrientsViewModel exactly -
 * genuine kcal/g factors, not an invented approximation (see design
 * discussion - Android already treats fiber as its own real slice of
 * a 4-way split, using 2.0 kcal/g, a standard approximation accounting
 * for partial fermentation by gut bacteria). */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, fiber: 2 } as const;

export const MACRO_RATIO_PRESETS: { label: string; ratio: MacroRatio }[] = [
  { label: "Balanced", ratio: { protein: 30, carbs: 37, fat: 30, fiber: 3 } },
  { label: "High Protein", ratio: { protein: 40, carbs: 27, fat: 30, fiber: 3 } },
  { label: "Low Carb", ratio: { protein: 40, carbs: 17, fat: 40, fiber: 3 } },
  { label: "Keto", ratio: { protein: 25, carbs: 4, fat: 70, fiber: 1 } },
];

/** Grams from a %-of-calories ratio, given the calorie target. Matches
 * Android's macroRow() computation exactly, same four factors. */
export function macroRatioToGrams(ratio: MacroRatio, kcalTarget: number) {
  return {
    protein: Math.round((kcalTarget * (ratio.protein / 100)) / KCAL_PER_G.protein),
    carbs: Math.round((kcalTarget * (ratio.carbs / 100)) / KCAL_PER_G.carbs),
    fat: Math.round((kcalTarget * (ratio.fat / 100)) / KCAL_PER_G.fat),
    fiber: Math.round((kcalTarget * (ratio.fiber / 100)) / KCAL_PER_G.fiber),
  };
}

/** The reverse - reconstructs an initial ratio from existing gram
 * targets, so editing an existing goal starts the sliders somewhere
 * sensible instead of always resetting to a preset. Rounds to whole
 * percent, so re-saving without touching the sliders can drift the
 * stored grams by a gram or two - an accepted tradeoff of moving to a
 * percentage-first input model, same as before. */
export function gramsToMacroRatio(proteinG: number, carbsG: number, fatG: number, fiberG: number): MacroRatio {
  const proteinKcal = proteinG * KCAL_PER_G.protein;
  const carbsKcal = carbsG * KCAL_PER_G.carbs;
  const fatKcal = fatG * KCAL_PER_G.fat;
  const fiberKcal = fiberG * KCAL_PER_G.fiber;
  const totalKcal = proteinKcal + carbsKcal + fatKcal + fiberKcal;
  if (totalKcal <= 0) return MACRO_RATIO_PRESETS[0].ratio;

  const proteinPct = Math.round((proteinKcal / totalKcal) * 100);
  const carbsPct = Math.round((carbsKcal / totalKcal) * 100);
  const fatPct = Math.round((fatKcal / totalKcal) * 100);
  // Exact remainder, not its own independent rounding - guarantees the
  // reconstructed ratio always sums to exactly 100.
  const fiberPct = 100 - proteinPct - carbsPct - fatPct;
  return { protein: proteinPct, carbs: carbsPct, fat: fatPct, fiber: fiberPct };
}