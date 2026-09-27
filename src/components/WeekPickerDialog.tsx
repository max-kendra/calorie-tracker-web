import { useState } from "react";
import { addDays, isoWeekNumber, startOfWeek, toIsoDate } from "@/lib/dates";
import { useEscapeToClose } from "@/lib/useEscapeToClose";

interface WeekPickerDialogProps {
  currentAnchor: Date;
  onSelectWeek: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export function WeekPickerDialog({ currentAnchor, onSelectWeek, onClose }: WeekPickerDialogProps) {
  useEscapeToClose(onClose);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(currentAnchor.getFullYear(), currentAnchor.getMonth(), 1),
  );

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);

  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(row);
  }

  const weekdayLabels = weeks[0].map((day) => WEEKDAY_FORMATTER.format(day));

  const todayIso = toIsoDate(new Date());
  const currentWeekStartIso = toIsoDate(startOfWeek(currentAnchor));

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-4 pointer-events-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
              aria-label="Previous month"
            >
              &larr;
            </button>
            <div className="font-semibold text-gray-800 dark:text-gray-100">{MONTH_YEAR_FORMATTER.format(viewMonth)}</div>
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
              aria-label="Next month"
            >
              &rarr;
            </button>
          </div>

          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="w-7 text-xs text-gray-400 dark:text-gray-500 font-normal">Wk</th>
                {weekdayLabels.map((label, i) => (
                  <th key={i} className="text-xs text-gray-400 dark:text-gray-500 font-normal pb-1">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((row) => {
                const rowStartIso = toIsoDate(row[0]);
                const isSelectedWeek = rowStartIso === currentWeekStartIso;
                return (
                  <tr key={rowStartIso} className="group">
                    <td className="text-xs text-gray-400 dark:text-gray-500 text-center">{isoWeekNumber(row[0])}</td>
                    {row.map((day) => {
                      const iso = toIsoDate(day);
                      const inViewMonth = day.getMonth() === viewMonth.getMonth();
                      const isToday = iso === todayIso;
                      return (
                        <td key={iso} className="p-0 text-center">
                          <button
                            onClick={() => {
                              onSelectWeek(day);
                              onClose();
                            }}
                            className={`w-9 h-9 rounded-full text-sm transition ${inViewMonth ? "text-gray-800 dark:text-gray-100" : "text-gray-300 dark:text-gray-600"}
                              ${isSelectedWeek ? "bg-blue-100 group-hover:bg-blue-200" : "group-hover:bg-gray-100 dark:hover:bg-gray-700"}
                              ${isToday ? "ring-2 ring-blue-400" : ""}`}
                          >
                            {day.getDate()}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}