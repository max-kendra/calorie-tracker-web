import { useContext } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Log, MealType } from "@/api/types";
import { CheckIcon, CopyIcon } from "./icons";
import { DragContext, SelectionContext, isSameSpot } from "@/lib/dragState";
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
  /** Rows and the meal header can be dragged to another day/meal. */
  draggable?: boolean;
  onCopyTo?: (payload: { kind: "log"; log: Log } | { kind: "meal"; date: string; mealType: MealType }) => void;
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
  draggable = false,
  onCopyTo,
}: MealSectionProps) {
  const totals = sumTotals(logs);
  const color = MEAL_COLORS[mealType];
  const { active, copy } = useContext(DragContext);
  const selection = useContext(SelectionContext);
  const mealIds = logs.map((l) => l.id);
  const allSelected = mealIds.length > 0 && mealIds.every((id) => selection.selected.has(id));
  const someSelected = !allSelected && mealIds.some((id) => selection.selected.has(id));

  const drag = useDraggable({
    id: `meal:${date}:${mealType}`,
    data: { kind: "meal", date, mealType },
    disabled: !draggable || logs.length === 0,
  });
  const drop = useDroppable({
    id: `drop:${date}:${mealType}`,
    data: { date, mealType },
    disabled: !active || active.kind === "day",
  });
  const showDrop = drop.isOver && active != null && active.kind !== "day" && !(isSameSpot(active, date, mealType) && !copy);

  return (
    <div className="rounded-lg overflow-hidden">
      <div
        ref={drag.setNodeRef}
        {...(draggable ? drag.listeners : {})}
        className="group/head flex items-center hover:brightness-95 transition"
        style={{ backgroundColor: color }}
      >
        {selection.selecting && logs.length > 0 && (
          <button
            onClick={() => selection.setMany(mealIds, !allSelected)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            aria-label={allSelected ? "Deselect meal" : "Select meal"}
            className={`ml-1.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
              allSelected || someSelected ? "bg-blue-500 border-blue-500 text-white" : "bg-white/70 border-gray-600"
            }`}
          >
            {allSelected ? <CheckIcon className="w-2.5 h-2.5" /> : someSelected ? <span className="w-1.5 h-0.5 bg-white rounded" /> : null}
          </button>
        )}
        <button
          onClick={() => onMealClick(date, mealType)}
          className="flex-1 min-w-0 px-2 py-1.5 flex items-baseline justify-between text-left"
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
        {onCopyTo && logs.length > 0 && (
          <button
            onClick={() => onCopyTo({ kind: "meal", date, mealType })}
            aria-label="Copy meal to..."
            className="px-1.5 self-stretch text-gray-700 opacity-0 group-hover/head:opacity-100 focus:opacity-100 transition"
          >
            <CopyIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div
        ref={drop.setNodeRef}
        className={`relative px-2 py-1 bg-white dark:bg-gray-800 transition ${
          showDrop ? (copy ? "ring-2 ring-inset ring-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" : "ring-2 ring-inset ring-blue-400 bg-blue-50 dark:bg-blue-950/40") : ""
        }`}
      >
        {showDrop && (
          <div className="absolute inset-x-0 top-1 z-10 flex justify-center pointer-events-none">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full text-white ${copy ? "bg-emerald-500" : "bg-blue-500"}`}>
              {copy ? "Copy here" : "Move here"}
            </span>
          </div>
        )}
        {logs.map((log) => (
          <ItemRow
            key={log.id}
            log={log}
            onOpenDetail={onOpenDetail}
            onQuantityClick={onQuantityClick}
            onDelete={onDelete}
            onAddToGroceryList={onAddToGroceryList}
            draggable={draggable}
            onCopyTo={onCopyTo ? (l) => onCopyTo({ kind: "log", log: l }) : undefined}
          />
        ))}
        <button
          onClick={() => onAddItem(date, mealType)}
          className="w-full mt-1 rounded-lg border border-dashed border-gray-200 dark:border-gray-600 py-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition group/add"
        >
          <span className="w-6 h-6 rounded-full bg-gray-200 group-hover/add:bg-gray-300 flex items-center justify-center text-gray-500 dark:text-gray-300 text-base leading-none">
            +
          </span>
        </button>
      </div>
    </div>
  );
}