import type { Log, MealType } from "@/api/types";
import { MEAL_LABELS, sumTotals } from "@/lib/macros";
import { MEAL_COLORS } from "@/lib/colors";
import { ItemRow } from "./ItemRow";

interface MealSectionProps {
  date: string;
  mealType: MealType;
  logs: Log[];
  /** Optional - only present when the active goal has a meal split
   * defined for this meal type (see MealGoalSplit on the backend).
   * Some goals may not have splits configured at all, in which case
   * this section just shows totals with nothing to compare against. */
  goalKcal?: number;
  /** Opens the meal detail panel for THIS date+mealType - see design
   * discussion: "clicking on the meal banner should open the meal in
   * greater detail". */
  onMealClick: (date: string, mealType: MealType) => void;
  onItemClick: (log: Log) => void;
}

export function MealSection({ date, mealType, logs, goalKcal, onMealClick, onItemClick }: MealSectionProps) {
  const totals = sumTotals(logs);
  const color = MEAL_COLORS[mealType];

  return (
    <div className="rounded-lg overflow-hidden">
      <button
        onClick={() => onMealClick(date, mealType)}
        className="w-full px-2 py-1.5 flex items-baseline justify-between hover:brightness-95 transition"
        style={{ backgroundColor: color }}
      >
        <span className="text-xs font-semibold text-gray-800">{MEAL_LABELS[mealType]}</span>
        <span className="text-xs text-gray-700">
          {totals.kcal}
          {goalKcal != null ? ` / ${goalKcal}` : ""} Cal
        </span>
      </button>
      <div className="px-2 py-1 bg-white">
        {logs.length === 0 ? (
          <div className="text-xs text-gray-400 py-1.5">Nothing logged</div>
        ) : (
          logs.map((log) => <ItemRow key={log.id} log={log} onClick={onItemClick} />)
        )}
      </div>
    </div>
  );
}