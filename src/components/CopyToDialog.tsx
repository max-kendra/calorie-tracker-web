import { useState } from "react";
import type { MealType } from "@/api/types";
import { useCopyLogs } from "@/api/hooks";
import { addDays, fromIsoDate, startOfWeek, toIsoDate } from "@/lib/dates";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/macros";
import { MEAL_COLORS } from "@/lib/colors";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { describePayload, type DragPayload } from "@/lib/dragState";
import { DialogShell } from "./DialogShell";

interface CopyToDialogProps {
  payload: DragPayload;
  logIds: number[];
  initialDate?: string;
  initialMeal?: MealType;
  initialMove?: boolean;
  onClose: () => void;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export function CopyToDialog({ payload, logIds, initialDate, initialMeal, initialMove = false, onClose }: CopyToDialogProps) {
  useEscapeToClose(onClose);
  const copyLogs = useCopyLogs();

  const sourceDate = payload.kind === "log" ? payload.log.date : payload.date;
  const sourceMeal: MealType | null =
    payload.kind === "log" ? payload.log.meal_type : payload.kind === "meal" ? payload.mealType : null;
  const keepsMeals = payload.kind === "day";

  const [date, setDate] = useState(initialDate ?? sourceDate);
  const [meal, setMeal] = useState<MealType>(initialMeal ?? sourceMeal ?? "breakfast");
  const [move, setMove] = useState(initialMove);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = fromIsoDate(initialDate ?? sourceDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const { title, subtitle } = describePayload(payload, logIds.length);
  const sameSpot = move && date === sourceDate && (keepsMeals || meal === sourceMeal);

  const gridStart = startOfWeek(viewMonth);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayIso = toIsoDate(new Date());

  function submit() {
    copyLogs.mutate(
      { log_ids: logIds, target_date: date, meal_type: keepsMeals ? undefined : meal, move },
      { onSuccess: onClose },
    );
  }

  const segmentClass = (active: boolean) =>
    `flex-1 px-3 py-1.5 text-sm rounded-md transition ${
      active ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-300"
    }`;

  return (
    <DialogShell
      title={move ? "Move to..." : "Copy to..."}
      onClose={onClose}
      stacked
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-red-500 min-w-0 truncate">
            {copyLogs.isError ? (copyLogs.error as Error).message : ""}
          </span>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={copyLogs.isPending || sameSpot}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
            >
              {copyLogs.isPending ? "Working..." : move ? "Move" : "Copy"}
            </button>
          </div>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
        </div>

        <div className="flex p-1 rounded-lg bg-gray-100 dark:bg-gray-700">
          <button onClick={() => setMove(false)} className={segmentClass(!move)}>Copy</button>
          <button onClick={() => setMove(true)} className={segmentClass(move)}>Move</button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
              aria-label="Previous month"
            >
              &larr;
            </button>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{MONTH_YEAR_FORMATTER.format(viewMonth)}</div>
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
              aria-label="Next month"
            >
              &rarr;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.slice(0, 7).map((d) => (
              <div key={toIsoDate(d)} className="text-xs text-gray-400 dark:text-gray-400 pb-1">
                {WEEKDAY_FORMATTER.format(d)}
              </div>
            ))}
            {days.map((d) => {
              const iso = toIsoDate(d);
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const selected = iso === date;
              return (
                <button
                  key={iso}
                  onClick={() => setDate(iso)}
                  className={`h-9 rounded-full text-sm transition ${
                    selected
                      ? "bg-blue-500 text-white"
                      : inMonth
                        ? "text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                        : "text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  } ${iso === todayIso && !selected ? "ring-2 ring-blue-400" : ""} ${iso === sourceDate && !selected ? "underline decoration-dotted" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {keepsMeals ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Each item keeps its own meal.</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`py-2 rounded-lg text-sm font-medium text-gray-800 transition ${
                  meal === m ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800" : "opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: MEAL_COLORS[m] }}
              >
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        )}
      </div>
    </DialogShell>
  );
}
