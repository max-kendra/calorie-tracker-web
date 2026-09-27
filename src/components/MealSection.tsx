import type { Log, MealType } from "@/api/types";
import { MEAL_LABELS, sumTotals } from "@/lib/macros";
import { MEAL_COLORS } from "@/lib/colors";
import { ItemRow } from "./ItemRow";

interface MealSectionProps {
  date: string;
  mealType: MealType;
  logs: Log[];
  goalKcal?: number;
  onMealClick: (date: string, mealType: MealType) => void;
  onOpenDetail: (log: Log) => void;
  onQuantityClick: (log: Log) => void;
  onDelete: (log: Log) => void;
  onAddToGroceryList: (log: Log) => void;
  onAddItem: (date: string, mealType: MealType) => void;
}

export function MealSection({
  date,
  mealType,
  logs,
  goalKcal,
  onMealClick,
  onOpenDetail,
  onQuantityClick,
  onDelete,
  onAddToGroceryList,
  onAddItem,
}: MealSectionProps) {
  const totals = sumTotals(logs);
  const color = MEAL_COLORS[mealType];

  return (
    <div className="rounded-lg overflow-hidden">
      <button
        onClick={() => onMealClick(date, mealType)}
        className="w-full px-2 py-1.5 flex items-baseline justify-between hover:brightness-95 transition"
        style={{ backgroundColor: color }}
      >
        {/* No dark: variants here - sits on the meal's own fixed
            pastel color, which doesn't change with theme (see
            MealDetailPanel's matching header for the fuller
            explanation). */}
        <span className="text-xs font-semibold text-gray-800">{MEAL_LABELS[mealType]}</span>
        <span className="text-xs text-gray-700">
          {totals.kcal}
          {goalKcal != null ? ` / ${goalKcal}` : ""} Cal
        </span>
      </button>
      <div className="px-2 py-1 bg-white dark:bg-gray-800">
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
  );
}