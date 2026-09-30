import type { Log } from "@/api/types";
import { logDisplayName, logQuantityLabel } from "@/lib/macros";
import { MACRO_COLORS } from "@/lib/colors";

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0-.6 9.4a1.5 1.5 0 0 1-1.5 1.4H8.1a1.5 1.5 0 0 1-1.5-1.4L6 6h8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ItemRowProps {
  log: Log;
  onOpenDetail: (log: Log) => void;
  onQuantityClick: (log: Log) => void;
  onDelete: (log: Log) => void;
  /** Adds this row's underlying item to the grocery list. Replaces the
   * old pencil icon (see design discussion) - that became redundant
   * once quantity editing got its own dedicated click zone AND the
   * full detail card grew its own quantity section too, leaving the
   * pencil with nothing left to do that another entry point didn't
   * already cover. */
  onAddToGroceryList: (log: Log) => void;
  /** Drag this log to another day/meal to move it there - see design
   * discussion. Optional so ItemRow can still be used anywhere
   * dragging wouldn't make sense without every caller needing to wire
   * it up. */
  onDragStart?: (log: Log) => void;
}

export function ItemRow({ log, onOpenDetail, onQuantityClick, onDelete, onAddToGroceryList, onDragStart }: ItemRowProps) {
  // Recipe logs have no single catalog item to add - hide the icon
  // entirely rather than trying to make it do something more
  // elaborate (add every ingredient? unclear what the user would even
  // want there) for a bundle of ingredients rather than one item.
  const canAddToGroceryList = log.item_id != null;

  return (
    <div className="group relative py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        draggable={!!onDragStart}
        onDragStart={onDragStart ? () => onDragStart(log) : undefined}
        onClick={() => onOpenDetail(log)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenDetail(log)}
        className={`cursor-pointer rounded px-1 -mx-1 hover:bg-gray-50 dark:hover:bg-gray-700 pr-14 flex items-center gap-2 ${onDragStart ? "active:cursor-grabbing" : ""}`}
      >
        {log.image_path ? (
          <img src={`/${log.image_path}`} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{logDisplayName(log)}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{log.kcal_logged} Cal</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityClick(log);
              }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:underline"
            >
              {logQuantityLabel(log)}
            </button>
            <span className="text-xs shrink-0 space-x-1">
              <span style={{ color: MACRO_COLORS.protein }}>{log.protein_g_logged}P</span>
              <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
              <span style={{ color: MACRO_COLORS.fat }}>{log.fat_g_logged}F</span>
              <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
              <span style={{ color: MACRO_COLORS.carbs }}>{log.carbs_g_logged}C</span>
              <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
              <span style={{ color: MACRO_COLORS.fiber }}>{log.fiber_g_logged}Fi</span>
            </span>
          </div>
        </div>
      </div>
      <div className="absolute right-1 top-1.5 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        {canAddToGroceryList && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToGroceryList(log);
            }}
            aria-label="Add to grocery list"
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
          >
            <PlusIcon />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(log);
          }}
          aria-label="Delete"
          className="p-1 rounded hover:bg-red-100 text-red-500"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}