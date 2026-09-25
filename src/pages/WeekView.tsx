import { useState } from "react";
import type { Log, MealType } from "@/api/types";
import { useActiveGoal, useLogsRange } from "@/api/hooks";
import { addDays, isoWeekNumber, startOfWeek, toIsoDate, weekDates } from "@/lib/dates";
import { groupByDateAndMeal, sumTotals } from "@/lib/macros";
import { DayColumn } from "@/components/DayColumn";
import { WeekMacroSummary } from "@/components/WeekMacroSummary";
import { MealDetailPanel } from "@/components/MealDetailPanel";
import { ItemDetailModal } from "@/components/ItemDetailModal";

export function WeekView() {
  // Defaults to the REAL current date every time this component
  // mounts fresh (no persistence, e.g. no localStorage of the last-
  // viewed week) - so opening the site always lands on the actual
  // current week and today's date, never wherever you last
  // pre-tracked ahead to (see design discussion: "when first entering
  // the site, we should automatically select the current week and
  // today's date, not the furthest tracked week because we
  // pre-track"). Nothing else in this app writes to anchorDate except
  // the nav buttons below, so this stays true for the life of the tab.
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const dates = weekDates(anchorDate);
  const startDate = dates[0];
  const endDate = dates[6];

  // Which meal's detail panel (if any) is open - null means closed.
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; mealType: MealType } | null>(null);
  // Which log's detail/edit modal (if any) is open - reachable from
  // BOTH the week grid directly and from inside the meal detail panel
  // (see ItemDetailModal's own doc comment), so this lives up here
  // rather than inside either of those, and can be open on top of
  // MealDetailPanel.
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const logsQuery = useLogsRange(startDate, endDate);
  const goalQuery = useActiveGoal();

  const todayIso = toIsoDate(new Date());
  // Only clamps to "days elapsed so far" when today actually falls
  // WITHIN the displayed week - comparing a partially-elapsed week's
  // totals against a partial budget makes sense there. A week entirely
  // in the past (already fully happened) or entirely in the future
  // (e.g. pre-tracked ahead of time - see design discussion) should
  // both compare against the FULL week's budget instead.
  const isCurrentWeek = todayIso >= startDate && todayIso <= endDate;
  const daysInWeekSoFar = isCurrentWeek ? dates.filter((d) => d <= todayIso).length : 7;

  function goToPreviousWeek() {
    setAnchorDate((prev) => addDays(startOfWeek(prev), -1));
  }
  function goToNextWeek() {
    setAnchorDate((prev) => addDays(startOfWeek(prev), 7));
  }
  function goToToday() {
    setAnchorDate(new Date());
  }

  if (logsQuery.isLoading || goalQuery.isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading...</div>;
  }
  if (logsQuery.isError) {
    return <div className="p-8 text-center text-red-500">Couldn't load logs: {(logsQuery.error as Error).message}</div>;
  }

  const logs = logsQuery.data ?? [];
  const grouped = groupByDateAndMeal(logs, dates);
  const weekTotals = sumTotals(logs);
  const weekNumber = isoWeekNumber(startOfWeek(anchorDate));

  // Keeps selectedLog in sync with the latest fetched data (e.g. right
  // after editing its quantity, the modal should show the NEW value,
  // not the stale object it was opened with) - looked up by id from
  // whatever's currently in the query cache rather than trusted as a
  // frozen snapshot.
  const liveSelectedLog = selectedLog ? logs.find((l) => l.id === selectedLog.id) ?? null : null;

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goToPreviousWeek} className="px-3 py-1.5 rounded-lg bg-white shadow-sm hover:bg-gray-50">
            &larr;
          </button>
          <button onClick={goToToday} className="px-3 py-1.5 rounded-lg bg-white shadow-sm hover:bg-gray-50 text-sm">
            Today
          </button>
          <button onClick={goToNextWeek} className="px-3 py-1.5 rounded-lg bg-white shadow-sm hover:bg-gray-50">
            &rarr;
          </button>
        </div>
        <div className="text-center">
          {/* Week number as the primary heading (see design discussion:
              "the date selector could say the week number instead of
              today/the date") - the exact date range kept as a smaller
              subtitle underneath rather than dropped entirely, since
              it's still genuinely useful for knowing exactly which
              days you're looking at, just not the FIRST thing you read. */}
          <h1 className="text-xl font-bold text-gray-800">Week {weekNumber}</h1>
          <div className="text-xs text-gray-400">
            {startDate} &ndash; {endDate}
          </div>
        </div>
        <div />
      </div>

      <WeekMacroSummary weekTotals={weekTotals} goal={goalQuery.data} daysInWeekSoFar={daysInWeekSoFar} />

      {/* px-1 here specifically so the today-column's ring (see
          DayColumn) has room to render fully - without it, the ring on
          the first/last column sits flush against this scroll
          container's own edge and gets visually clipped (see design
          discussion: "the little border on today's date is getting
          cropped away"). */}
      <div className="flex gap-2 overflow-x-auto overflow-y-visible px-1 pb-4">
        {dates.map((date) => (
          <DayColumn
            key={date}
            date={date}
            logsByMeal={grouped[date]}
            goal={goalQuery.data}
            onMealClick={(d, mealType) => setSelectedMeal({ date: d, mealType })}
            onItemClick={setSelectedLog}
          />
        ))}
      </div>

      {selectedMeal && (
        <MealDetailPanel
          date={selectedMeal.date}
          mealType={selectedMeal.mealType}
          logs={grouped[selectedMeal.date][selectedMeal.mealType]}
          goal={goalQuery.data}
          onClose={() => setSelectedMeal(null)}
          onItemClick={setSelectedLog}
        />
      )}

      {liveSelectedLog && <ItemDetailModal log={liveSelectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}