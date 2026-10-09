import { useState } from "react";
import type { Goal, Log, MealType } from "@/api/types";
import { MEAL_LABELS, sumTotals } from "@/lib/macros";
import { MEAL_COLORS, MACRO_COLORS } from "@/lib/colors";
import { shortDateLabel, weekdayLabel } from "@/lib/dates";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { MacroBar } from "./MacroBar";
import { ItemRow } from "./ItemRow";
import { SaveMealDialog } from "./SaveMealDialog";
import { useSaveMeal } from "@/api/hooks";

interface MealDetailPanelProps {
  date: string;
  mealType: MealType;
  logs: Log[];
  goal: Goal | undefined;
  onClose: () => void;
  onOpenDetail: (log: Log) => void;
  onQuantityClick: (log: Log) => void;
  onDelete: (log: Log) => void;
  onAddToGroceryList: (log: Log) => void;
  onAddItem: (date: string, mealType: MealType) => void;
}

export function MealDetailPanel({
  date,
  mealType,
  logs,
  goal,
  onClose,
  onOpenDetail,
  onQuantityClick,
  onDelete,
  onAddToGroceryList,
  onAddItem,
}: MealDetailPanelProps) {
  useEscapeToClose(onClose);
  const totals = sumTotals(logs);
  const split = goal?.meal_splits.find((s) => s.meal_type === mealType);
  const color = MEAL_COLORS[mealType];
  const [savingMeal, setSavingMeal] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveMeal = useSaveMeal();
  const savable = logs.filter((l) => l.item_id != null);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
        <div className="px-4 py-3" style={{ backgroundColor: color }}>
          {/* No dark: variants anywhere in this block - it sits on the
              meal's own fixed pastel color (breakfast orange etc),
              which does NOT change between light/dark mode, so its
              text needs to stay a fixed dark color too, not flip
              light in dark mode (see design discussion - this was
              genuinely unreadable before: light text on a light
              background regardless of the app's own theme). */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-600">
                {weekdayLabel(date)} {shortDateLabel(date)}
              </div>
              <div className="flex items-center gap-1">
                <h2 className="text-lg font-semibold text-gray-800">{MEAL_LABELS[mealType]}</h2>
                {savable.length > 0 && (
                  <button
                    onClick={() => setSavingMeal(true)}
                    title={saved ? "Saved as a meal" : "Save as a meal"}
                    aria-label="Save as a meal"
                    className="text-gray-600 hover:text-gray-900 p-0.5"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                      <path d="M6 3h12v18l-6-4-6 4z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-xl leading-none px-1">
              &times;
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-700">
          {split ? (
            <>
              <MacroBar label="Calories" eaten={totals.kcal} goal={split.computed_totals.kcal} color={MACRO_COLORS.kcal} unit=" Cal" compact />
              <MacroBar label="Protein" eaten={totals.protein_g} goal={split.computed_totals.protein_g} color={MACRO_COLORS.protein} compact />
              <MacroBar label="Fat" eaten={totals.fat_g} goal={split.computed_totals.fat_g} color={MACRO_COLORS.fat} compact />
              <MacroBar label="Carbs" eaten={totals.carbs_g} goal={split.computed_totals.carbs_g} color={MACRO_COLORS.carbs} compact />
              <MacroBar label="Fiber" eaten={totals.fiber_g} goal={split.computed_totals.fiber_g} color={MACRO_COLORS.fiber} compact />
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {totals.kcal} Cal - {totals.protein_g}P - {totals.fat_g}F - {totals.carbs_g}C - {totals.fiber_g}Fi
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {logs.map((log) => (
            <ItemRow key={log.id} log={log} onOpenDetail={onOpenDetail} onQuantityClick={onQuantityClick} onDelete={onDelete} onAddToGroceryList={onAddToGroceryList} />
          ))}
          <button
            onClick={() => onAddItem(date, mealType)}
            className="w-full mt-1 rounded-lg border border-dashed border-gray-200 dark:border-gray-600 py-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition group/add"
          >
            <span className="w-6 h-6 rounded-full bg-gray-200 group-hover/add:bg-gray-300 flex items-center justify-center text-gray-500 dark:text-gray-400 text-base leading-none">
              +
            </span>
          </button>
        </div>
      </div>
      {savingMeal && (
        <SaveMealDialog
          defaultName=""
          skippedCount={logs.length - savable.length}
          isPending={saveMeal.isPending}
          error={saveMeal.isError ? "Failed to save meal" : null}
          onCancel={() => setSavingMeal(false)}
          onSave={(name) =>
            saveMeal.mutate(
              {
                name,
                ingredients: savable.map((l) => ({
                  item_id: l.item_id as number,
                  serving_size_id: l.serving_size_id,
                  quantity: Number(l.quantity),
                })),
              },
              {
                onSuccess: () => {
                  setSavingMeal(false);
                  setSaved(true);
                },
              },
            )
          }
        />
      )}
    </>
  );
}