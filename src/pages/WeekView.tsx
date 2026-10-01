import { useState } from "react";
import type { Log, MealType } from "@/api/types";
import { useCreateGroceryEntry, useCreateLog, useDeleteLog, useGoalsList, useLogsRange } from "@/api/hooks";
import { addDays, formatWeekRangeLabel, isoWeekNumber, startOfWeek, weekDates } from "@/lib/dates";
import { resolveGoalForDate, sumGoalTargetsForWeek } from "@/lib/goals";
import { groupByDateAndMeal, logDisplayName, sumTotals } from "@/lib/macros";
import { DayColumn } from "@/components/DayColumn";
import { WeekMacroSummary } from "@/components/WeekMacroSummary";
import { MealDetailPanel } from "@/components/MealDetailPanel";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { QuantityEditDialog } from "@/components/QuantityEditDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WeekPickerDialog } from "@/components/WeekPickerDialog";
import { AddItemDialog } from "@/components/AddItemDialog";

export function WeekView() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const dates = weekDates(anchorDate);
  const startDate = dates[0];
  const endDate = dates[6];

  const [selectedMeal, setSelectedMeal] = useState<{ date: string; mealType: MealType } | null>(null);
  const [viewingLog, setViewingLog] = useState<Log | null>(null);
  const [quantityLog, setQuantityLog] = useState<Log | null>(null);
  const [deletingLog, setDeletingLog] = useState<Log | null>(null);
  const [addingTo, setAddingTo] = useState<{ date: string; mealType: MealType } | null>(null);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [draggedLog, setDraggedLog] = useState<Log | null>(null);
  const [draggedMeal, setDraggedMeal] = useState<{ date: string; mealType: MealType } | null>(null);

  function handleLogDragStart(log: Log) {
    setDraggedMeal(null);
    setDraggedLog(log);
  }

  function handleMealDragStart(date: string, mealType: MealType) {
    setDraggedLog(null);
    setDraggedMeal({ date, mealType });
  }

  const logsQuery = useLogsRange(startDate, endDate);
  // Full history, not just "the active one" - a week can span more
  // than one goal now that goals have date ranges (see design
  // discussion). Each day resolves its OWN applicable goal below,
  // rather than the whole week assuming a single shared one.
  const goalsQuery = useGoalsList();
  const deleteLog = useDeleteLog();
  const createGroceryEntry = useCreateGroceryEntry();
  const createLog = useCreateLog();

  function handleAddToGroceryList(log: Log) {
    if (log.item_id == null) return;
    createGroceryEntry.mutate(log.item_id);
  }

  function goToPreviousWeek() {
    setAnchorDate((prev) => addDays(startOfWeek(prev), -1));
  }
  function goToNextWeek() {
    setAnchorDate((prev) => addDays(startOfWeek(prev), 7));
  }

  if (logsQuery.isLoading || goalsQuery.isLoading) {
    return <div className="p-8 text-center text-gray-400 dark:text-gray-500">Loading...</div>;
  }
  if (logsQuery.isError) {
    return <div className="p-8 text-center text-red-500">Couldn't load logs: {(logsQuery.error as Error).message}</div>;
  }

  const logs = logsQuery.data ?? [];

  /** "Move" is create-at-the-new-spot then delete-the-old (see design
   * discussion) - LogUpdate deliberately doesn't support changing
   * date/meal_type at all ("that's delete and re-log, not edit" - see
   * its own docstring), so this respects that existing design rather
   * than relaxing it. "Copy" is just the create half, leaving the
   * original untouched. Handles both a single dragged log and a whole
   * dragged meal (every log sharing its date+mealType) - whichever of
   * draggedLog/draggedMeal is actually set. Dropping a single item
   * back onto its own exact spot is a no-op UNLESS copying (see
   * design discussion: "can we duplicate a logged item in the same
   * meal on the same day" - a same-spot drop is precisely how that
   * works, since there's nowhere else to indicate "right here,
   * again"). Whole-meal drops don't have an equivalent same-spot
   * duplicate case asked for, so that one stays guarded either way. */
  function duplicateOrMoveLog(log: Log, targetDate: string, targetMealType: MealType, isCopy: boolean) {
    createLog.mutate(
      {
        date: targetDate,
        meal_type: targetMealType,
        item_id: log.item_id ?? undefined,
        recipe_id: log.recipe_id ?? undefined,
        quantity: parseFloat(log.quantity),
        serving_size_id: log.serving_size_id,
      },
      {
        onSuccess: () => {
          if (!isCopy) deleteLog.mutate(log.id);
        },
      },
    );
  }

  function handleDropLog(targetDate: string, targetMealType: MealType, isCopy: boolean) {
    const meal = draggedMeal;
    const log = draggedLog;
    setDraggedMeal(null);
    setDraggedLog(null);

    if (meal) {
      if (meal.date === targetDate && meal.mealType === targetMealType) return;
      const mealLogs = logs.filter((l) => l.date === meal.date && l.meal_type === meal.mealType);
      mealLogs.forEach((l) => duplicateOrMoveLog(l, targetDate, targetMealType, isCopy));
      return;
    }

    if (!log) return;
    if (log.date === targetDate && log.meal_type === targetMealType && !isCopy) return;
    duplicateOrMoveLog(log, targetDate, targetMealType, isCopy);
  }

  const goals = goalsQuery.data ?? [];
  const grouped = groupByDateAndMeal(logs, dates);
  const weekTotals = sumTotals(logs);
  const weekNumber = isoWeekNumber(startOfWeek(anchorDate));

  // The full week's target, summing each day's own applicable goal -
  // NOT one goal's daily target times a day count. That old model
  // broke in two ways at once: it assumed a single goal for the whole
  // week (wrong once goals can start mid-week), and it truncated to
  // "days so far" (wrong for this app's actual pre-tracking use case,
  // where weekTotals above already reflects the WHOLE week's logged
  // data regardless of what day today is - comparing that against a
  // partial-week target is what produced the "1800 target, 6573
  // actual" bug).
  const targetTotals = sumGoalTargetsForWeek(goals, dates);

  const liveViewingLog = viewingLog ? logs.find((l) => l.id === viewingLog.id) ?? null : null;
  const liveQuantityLog = quantityLog ? logs.find((l) => l.id === quantityLog.id) ?? null : null;
  const selectedMealGoal = selectedMeal ? resolveGoalForDate(goals, selectedMeal.date) : undefined;

  return (
    <div className="max-w-[2000px] mx-auto p-4">
      <div className="grid grid-cols-3 items-center mb-4">
        <div className="flex items-center gap-2 justify-self-start">
          <button onClick={goToPreviousWeek} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            &larr;
          </button>
          <button
            onClick={() => setShowWeekPicker(true)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center"
            aria-label="Pick a week"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={goToNextWeek} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            &rarr;
          </button>
        </div>
        <div className="text-center justify-self-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Week {weekNumber}</h1>
          <div className="text-xs text-gray-400 dark:text-gray-500">{formatWeekRangeLabel(startDate, endDate)}</div>
        </div>
        <div />
      </div>

      <WeekMacroSummary weekTotals={weekTotals} targetTotals={targetTotals} />

      {/* overflow-x-auto stays as a safety net for genuinely narrow
          viewports, but DayColumn's min-width is now small enough that
          7 columns should fit without scrolling on ordinary desktop
          widths - see DayColumn's own comment. */}
      <div className="flex gap-2 overflow-x-auto px-1 pt-1 pb-4">
        {dates.map((date) => (
          <DayColumn
            key={date}
            date={date}
            logsByMeal={grouped[date]}
            goal={resolveGoalForDate(goals, date)}
            onMealClick={(d, mealType) => setSelectedMeal({ date: d, mealType })}
            onOpenDetail={setViewingLog}
            onQuantityClick={setQuantityLog}
            onDelete={setDeletingLog}
            onAddToGroceryList={handleAddToGroceryList}
            onAddItem={(d, mealType) => setAddingTo({ date: d, mealType })}
            onDragStart={handleLogDragStart}
            onMealDragStart={handleMealDragStart}
            onDropLog={handleDropLog}
          />
        ))}
      </div>

      {selectedMeal && (
        <MealDetailPanel
          date={selectedMeal.date}
          mealType={selectedMeal.mealType}
          logs={grouped[selectedMeal.date][selectedMeal.mealType]}
          goal={selectedMealGoal}
          onClose={() => setSelectedMeal(null)}
          onOpenDetail={setViewingLog}
          onQuantityClick={setQuantityLog}
          onDelete={setDeletingLog}
          onAddToGroceryList={handleAddToGroceryList}
          onAddItem={(d, mealType) => setAddingTo({ date: d, mealType })}
        />
      )}

      {liveViewingLog && <ItemDetailModal log={liveViewingLog} onClose={() => setViewingLog(null)} />}

      {liveQuantityLog && <QuantityEditDialog log={liveQuantityLog} onClose={() => setQuantityLog(null)} />}

      {deletingLog && (
        <ConfirmDialog
          title="Delete this log?"
          message={`Remove "${logDisplayName(deletingLog)}" from this meal. This can't be undone.`}
          confirmLabel="Delete"
          danger
          isPending={deleteLog.isPending}
          error={deleteLog.isError ? (deleteLog.error as Error).message : null}
          onCancel={() => setDeletingLog(null)}
          onConfirm={() => deleteLog.mutate(deletingLog.id, { onSuccess: () => setDeletingLog(null) })}
        />
      )}

      {addingTo && <AddItemDialog date={addingTo.date} mealType={addingTo.mealType} onClose={() => setAddingTo(null)} />}

      {showWeekPicker && (
        <WeekPickerDialog
          currentAnchor={anchorDate}
          onSelectWeek={setAnchorDate}
          onClose={() => setShowWeekPicker(false)}
        />
      )}
    </div>
  );
}