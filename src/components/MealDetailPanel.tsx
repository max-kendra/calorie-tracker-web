import type { Goal, Log, MealType } from "@/api/types";
import { MEAL_LABELS, sumTotals } from "@/lib/macros";
import { MEAL_COLORS, MACRO_COLORS } from "@/lib/colors";
import { shortDateLabel, weekdayLabel } from "@/lib/dates";
import { MacroBar } from "./MacroBar";
import { ItemRow } from "./ItemRow";

interface MealDetailPanelProps {
  date: string;
  mealType: MealType;
  logs: Log[];
  goal: Goal | undefined;
  onClose: () => void;
  onItemClick: (log: Log) => void;
}

/** Slide-over from the right rather than a modal dialog (see design
 * discussion: "i'm not sure if a window to the side or a modal dialog
 * window would be better") - chosen so the week grid stays visible
 * and in-place behind it (this is a drill-down INTO a meal you're
 * still oriented within the week for, not an interruption), and so it
 * doesn't compete for the same modal layer as ItemDetailModal, which
 * needs to be openable ON TOP of this panel (clicking an item inside
 * here opens item detail as an actual centered modal - a more
 * focused, form-like interaction, appropriate for something that's
 * also an edit screen). */
export function MealDetailPanel({ date, mealType, logs, goal, onClose, onItemClick }: MealDetailPanelProps) {
  const totals = sumTotals(logs);
  const split = goal?.meal_splits.find((s) => s.meal_type === mealType);
  const color = MEAL_COLORS[mealType];

  return (
    <>
      {/* Backdrop - click to close, same as ItemDetailModal's. */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 flex flex-col">
        <div className="px-4 py-3" style={{ backgroundColor: color }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-600">
                {weekdayLabel(date)} {shortDateLabel(date)}
              </div>
              <h2 className="text-lg font-semibold text-gray-800">{MEAL_LABELS[mealType]}</h2>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-xl leading-none px-1">
              &times;
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 border-b border-gray-100">
          {split ? (
            <>
              <MacroBar label="Protein" eaten={totals.protein_g} goal={split.computed_totals.protein_g} color={MACRO_COLORS.protein} compact />
              <MacroBar label="Fat" eaten={totals.fat_g} goal={split.computed_totals.fat_g} color={MACRO_COLORS.fat} compact />
              <MacroBar label="Carbs" eaten={totals.carbs_g} goal={split.computed_totals.carbs_g} color={MACRO_COLORS.carbs} compact />
              <MacroBar label="Fiber" eaten={totals.fiber_g} goal={split.computed_totals.fiber_g} color={MACRO_COLORS.fiber} compact />
            </>
          ) : (
            <div className="text-sm text-gray-500">
              {totals.kcal} Cal · {totals.protein_g}P · {totals.fat_g}F · {totals.carbs_g}C · {totals.fiber_g}Fi
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {logs.length === 0 ? (
            <div className="text-sm text-gray-400">Nothing logged for this meal</div>
          ) : (
            logs.map((log) => <ItemRow key={log.id} log={log} onClick={onItemClick} />)
          )}
        </div>
      </div>
    </>
  );
}