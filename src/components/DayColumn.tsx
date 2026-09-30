import type { Goal, Log, MealType } from "@/api/types";
import { MEAL_TYPES, sumTotals } from "@/lib/macros";
import { isToday, shortDateLabel, weekdayLabel } from "@/lib/dates";
import { parseDecimal } from "@/lib/format";
import { MACRO_COLORS } from "@/lib/colors";
import { MealSection } from "./MealSection";

interface DayColumnProps {
  date: string;
  logsByMeal: Record<MealType, Log[]>;
  goal: Goal | undefined;
  onMealClick: (date: string, mealType: MealType) => void;
  onOpenDetail: (log: Log) => void;
  onQuantityClick: (log: Log) => void;
  onDelete: (log: Log) => void;
  onAddToGroceryList: (log: Log) => void;
  onAddItem: (date: string, mealType: MealType) => void;
  onDragStart?: (log: Log) => void;
  onDropLog?: (date: string, mealType: MealType, isCopy: boolean) => void;
}

export function DayColumn({
  date,
  logsByMeal,
  goal,
  onMealClick,
  onOpenDetail,
  onQuantityClick,
  onDelete,
  onAddToGroceryList,
  onAddItem,
  onDragStart,
  onDropLog,
}: DayColumnProps) {
  const allLogs = MEAL_TYPES.flatMap((meal) => logsByMeal[meal]);
  const dayTotals = sumTotals(allLogs);
  const kcalGoal = goal ? Math.round(parseDecimal(goal.kcal_target)) : undefined;
  const today = isToday(date);

  return (
    // 130px, not 220px - 7 columns at 220px needed ~1620px total width
    // just for the grid itself, which didn't reliably fit even on
    // fairly wide laptop screens (see design discussion: "the last day
    // gets cut off and you need to scroll"). 130px keeps this
    // comfortable down to something like a 1280px-wide window.
    <div className={`flex flex-col min-w-[130px] flex-1 rounded-xl ${today ? "ring-2 ring-blue-400" : ""}`}>
      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-t-xl border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-baseline justify-between">
          <span className={`text-sm font-semibold ${today ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-100"}`}>
            {weekdayLabel(date)} <span className="font-normal text-gray-400 dark:text-gray-500">{shortDateLabel(date)}</span>
          </span>
        </div>
        <div className="text-xs mt-0.5 space-x-1">
          <span className="text-gray-500 dark:text-gray-400">
            {dayTotals.kcal}
            {kcalGoal != null ? `/${kcalGoal}` : ""} Cal
          </span>
          <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
          <span style={{ color: MACRO_COLORS.protein }}>{dayTotals.protein_g}P</span>
          <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
          <span style={{ color: MACRO_COLORS.fat }}>{dayTotals.fat_g}F</span>
          <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
          <span style={{ color: MACRO_COLORS.carbs }}>{dayTotals.carbs_g}C</span>
          <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
          <span style={{ color: MACRO_COLORS.fiber }}>{dayTotals.fiber_g}Fi</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-b-xl flex-1">
        {MEAL_TYPES.map((mealType) => {
          const split = goal?.meal_splits.find((s) => s.meal_type === mealType);
          return (
            <MealSection
              key={mealType}
              date={date}
              mealType={mealType}
              logs={logsByMeal[mealType]}
              goalKcal={split?.computed_totals.kcal}
              onMealClick={onMealClick}
              onOpenDetail={onOpenDetail}
              onQuantityClick={onQuantityClick}
              onDelete={onDelete}
              onAddToGroceryList={onAddToGroceryList}
              onAddItem={onAddItem}
              onDragStart={onDragStart}
              onDropLog={onDropLog}
            />
          );
        })}
      </div>
    </div>
  );
}