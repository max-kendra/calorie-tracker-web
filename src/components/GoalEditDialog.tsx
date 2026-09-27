import { useState } from "react";
import type { Goal, MealGoalSplitInput, MealType } from "@/api/types";
import { useCreateGoal, useDeleteGoal, useUpdateGoal, useUpdateMealSplits, type GoalPayload } from "@/api/hooks";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { gramsToMacroRatio, macroRatioToGrams, MACRO_RATIO_PRESETS, type MacroRatio } from "@/lib/macroRatio";
import { MACRO_COLORS } from "@/lib/colors";
import { MacroRatioPie } from "./MacroRatioPie";

interface GoalEditDialogProps {
  /** null means creating a brand new goal. */
  goal: Goal | null;
  onClose: () => void;
}

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
const DEFAULT_SPLIT_PCT: Record<MealType, string> = {
  breakfast: "30",
  lunch: "30",
  dinner: "30",
  snack: "10",
};

function parseOrZero(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Create/edit dialog for a goal - date range, calories, a %-of-
 * calories macro ratio (sliders + presets + pie chart), and the
 * meal-split percentages. Protein/carbs/fat/fiber grams are all
 * DERIVED from the ratio + calorie target at save time - the ratio,
 * not grams, is what's actually being edited. Matches the Android
 * app's own MacronutrientsViewModel exactly: a genuine 4-way split
 * (fiber included, using its own real 2.0 kcal/g factor - see design
 * discussion, an earlier pass here wrongly excluded it), each slider
 * set independently with NO auto-rebalancing - a running total just
 * gates Save, same as meal-split percentages already work. */
export function GoalEditDialog({ goal, onClose }: GoalEditDialogProps) {
  useEscapeToClose(onClose);
  const isCreating = goal == null;

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const updateMealSplits = useUpdateMealSplits();
  const deleteGoal = useDeleteGoal();

  const [startDate, setStartDate] = useState(goal?.start_date ?? "");
  const [isOngoing, setIsOngoing] = useState(goal ? goal.end_date == null : true);
  const [endDate, setEndDate] = useState(goal?.end_date ?? "");
  const [kcalTarget, setKcalTarget] = useState(goal?.kcal_target ?? "");
  const [macroRatio, setMacroRatio] = useState<MacroRatio>(() =>
    goal
      ? gramsToMacroRatio(
          parseOrZero(goal.protein_g_target),
          parseOrZero(goal.carbs_g_target),
          parseOrZero(goal.fat_g_target),
          parseOrZero(goal.fiber_g_target),
        )
      : MACRO_RATIO_PRESETS[0].ratio,
  );
  const [splitPct, setSplitPct] = useState<Record<MealType, string>>(() => {
    if (!goal) return { ...DEFAULT_SPLIT_PCT };
    const fromGoal: Partial<Record<MealType, string>> = {};
    for (const s of goal.meal_splits) fromGoal[s.meal_type] = s.pct_of_kcal;
    return {
      breakfast: fromGoal.breakfast ?? DEFAULT_SPLIT_PCT.breakfast,
      lunch: fromGoal.lunch ?? DEFAULT_SPLIT_PCT.lunch,
      dinner: fromGoal.dinner ?? DEFAULT_SPLIT_PCT.dinner,
      snack: fromGoal.snack ?? DEFAULT_SPLIT_PCT.snack,
    };
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const splitSum = MEAL_TYPES.reduce((sum, mt) => sum + parseOrZero(splitPct[mt]), 0);
  const splitsValid = Math.abs(splitSum - 100) < 0.01;
  const ratioSum = macroRatio.protein + macroRatio.carbs + macroRatio.fat + macroRatio.fiber;
  const ratioValid = ratioSum === 100;
  const derivedGrams = macroRatioToGrams(macroRatio, parseOrZero(kcalTarget));

  const isSaving = createGoal.isPending || updateGoal.isPending || updateMealSplits.isPending;
  const saveError = createGoal.isError
    ? (createGoal.error as Error).message
    : updateGoal.isError
      ? (updateGoal.error as Error).message
      : updateMealSplits.isError
        ? (updateMealSplits.error as Error).message
        : null;

  function buildMealSplits(): MealGoalSplitInput[] {
    return MEAL_TYPES.map((mt) => ({ meal_type: mt, pct_of_kcal: parseOrZero(splitPct[mt]) }));
  }

  async function handleSave() {
    if (!startDate || !splitsValid || !ratioValid) return;
    const basePayload: GoalPayload = {
      start_date: startDate,
      end_date: isOngoing ? null : endDate || null,
      kcal_target: parseOrZero(kcalTarget),
      protein_g_target: derivedGrams.protein,
      carbs_g_target: derivedGrams.carbs,
      fat_g_target: derivedGrams.fat,
      fiber_g_target: derivedGrams.fiber,
    };

    if (isCreating) {
      createGoal.mutate({ ...basePayload, meal_splits: buildMealSplits() }, { onSuccess: onClose });
      return;
    }

    await updateGoal.mutateAsync({ goalId: goal.id, payload: basePayload });
    updateMealSplits.mutate({ goalId: goal.id, splits: buildMealSplits() }, { onSuccess: onClose });
  }

  function handleDelete() {
    if (!goal) return;
    deleteGoal.mutate(goal.id, { onSuccess: onClose });
  }

  function handleSliderChange(key: keyof MacroRatio, value: number) {
    setMacroRatio((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, value)) }));
  }

  const sliderRows: { key: keyof MacroRatio; label: string; color: string }[] = [
    { key: "protein", label: "Protein", color: MACRO_COLORS.protein },
    { key: "carbs", label: "Carbs", color: MACRO_COLORS.carbs },
    { key: "fat", label: "Fat", color: MACRO_COLORS.fat },
    { key: "fiber", label: "Fiber", color: MACRO_COLORS.fiber },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh] pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{isCreating ? "New goal" : "Edit goal"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  disabled={isOngoing}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={isOngoing} onChange={(e) => setIsOngoing(e.target.checked)} />
              Ongoing (no end date yet)
            </label>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Calories</label>
              <input
                type="number"
                step="any"
                value={kcalTarget}
                onChange={(e) => setKcalTarget(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Macro ratio</div>
              <div className="flex gap-1">
                {MACRO_RATIO_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setMacroRatio(preset.ratio)}
                    className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <MacroRatioPie ratio={macroRatio} />

            <div className={`text-xs text-right ${ratioValid ? "text-gray-400 dark:text-gray-500" : "text-red-500"}`}>
              {ratioSum}% {ratioValid ? "" : "(must be 100%)"}
            </div>

            {sliderRows.map(({ key, label, color }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-xs w-14 shrink-0" style={{ color }}>
                  {label}
                </span>
                <button
                  onClick={() => handleSliderChange(key, macroRatio[key] - 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
                  aria-label={`Decrease ${label}`}
                >
                  &minus;
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-24 text-center shrink-0">
                  {macroRatio[key]}% - {derivedGrams[key]}g
                </span>
                <button
                  onClick={() => handleSliderChange(key, macroRatio[key] + 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
                  aria-label={`Increase ${label}`}
                >
                  +
                </button>
              </div>
            ))}

            <div className="flex items-baseline justify-between pt-2">
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Meal split (% of calories)</div>
              <div className={`text-xs font-medium ${splitsValid ? "text-gray-400 dark:text-gray-500" : "text-red-500"}`}>
                {splitSum}% {splitsValid ? "" : "(must be 100%)"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((mt) => (
                <div key={mt}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{MEAL_LABELS[mt]}</label>
                  <input
                    type="number"
                    step="any"
                    value={splitPct[mt]}
                    onChange={(e) => setSplitPct((prev) => ({ ...prev, [mt]: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            {!isCreating && (
              <div className="pt-2">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full text-red-500 text-sm py-2 rounded-lg border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete this goal
                  </button>
                ) : (
                  <div className="border border-red-200 rounded-lg p-2">
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Delete this goal? This can't be undone.</div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 text-sm py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteGoal.isPending}
                        className="flex-1 text-sm py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-40"
                      >
                        {deleteGoal.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                    {deleteGoal.isError && <div className="text-xs text-red-500 mt-1">{(deleteGoal.error as Error).message}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            {saveError && <div className="text-xs text-red-500 mb-2">{saveError}</div>}
            <button
              onClick={handleSave}
              disabled={isSaving || !startDate || !splitsValid || !ratioValid}
              className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-600"
            >
              {isSaving ? "Saving..." : isCreating ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}