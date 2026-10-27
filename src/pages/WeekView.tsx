import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSearchParams } from "react-router-dom";
import type { Log, MealType } from "@/api/types";
import { useCopyLogs, useCreateGroceryEntry, useDeleteLog, useGoalsList, useLogsRange } from "@/api/hooks";
import { addDays, formatWeekRangeLabel, fromIsoDate, isoWeekNumber, startOfWeek, toIsoDate, weekDates } from "@/lib/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { resolveGoalForDate, sumGoalTargetsForWeek } from "@/lib/goals";
import { groupByDateAndMeal, logDisplayName, sumTotals } from "@/lib/macros";
import { DayColumn } from "@/components/DayColumn";
import { WeekMacroSummary } from "@/components/WeekMacroSummary";
import { MealDetailPanel } from "@/components/MealDetailPanel";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { QuantityEditDialog } from "@/components/QuantityEditDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { hasOpenDialog } from "@/lib/useEscapeToClose";
import { WeekPickerDialog } from "@/components/WeekPickerDialog";
import { AddItemDialog } from "@/components/AddItemDialog";
import { CopyToDialog } from "@/components/CopyToDialog";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { DragContext, SelectionContext, describePayload, isSameSpot, logsForPayload, type DragPayload } from "@/lib/dragState";

const NAV_BUTTON_CLASS =
  "w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-200 flex items-center justify-center";
const WEEK_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function WeekView() {
  // The viewed week lives in the URL (?week=YYYY-MM-DD, the week's first
  // day) so a refresh or shared link stays on the same week. No param
  // means the current week. Any date in the param is snapped to its
  // week's start, which also keeps old links valid if the first-day-of-
  // week setting changes.
  const [searchParams, setSearchParams] = useSearchParams();
  const weekParam = searchParams.get("week");
  const anchorDate = useMemo(() => {
    if (weekParam && WEEK_PARAM_PATTERN.test(weekParam)) {
      const parsed = fromIsoDate(weekParam);
      if (!Number.isNaN(parsed.getTime())) return startOfWeek(parsed);
    }
    return new Date();
  }, [weekParam]);

  function setAnchorDate(date: Date) {
    const start = startOfWeek(date);
    if (toIsoDate(start) === toIsoDate(startOfWeek(new Date()))) {
      setSearchParams({});
    } else {
      setSearchParams({ week: toIsoDate(start) });
    }
  }
  const dates = weekDates(anchorDate);
  const startDate = dates[0];
  const endDate = dates[6];

  const [selectedMeal, setSelectedMeal] = useState<{ date: string; mealType: MealType } | null>(null);
  const [viewingLog, setViewingLog] = useState<Log | null>(null);
  const [quantityLog, setQuantityLog] = useState<Log | null>(null);
  const [deletingLog, setDeletingLog] = useState<Log | null>(null);
  const [addingTo, setAddingTo] = useState<{ date: string; mealType: MealType } | null>(null);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [active, setActive] = useState<DragPayload | null>(null);
  const [copy, setCopy] = useState(false);
  const copyRef = useRef(false);
  const [copyDialog, setCopyDialog] = useState<{
    payload: DragPayload;
    initialDate?: string;
    initialMeal?: MealType;
    initialMove?: boolean;
  } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(new Set());

  function exitSelecting() {
    setSelecting(false);
    setSelectedIds(new Set());
  }

  // Selected logs belong to the visible week's data, so a different
  // week starts clean.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [weekParam]);

  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !hasOpenDialog()) exitSelecting();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  function updateCopy(value: boolean) {
    copyRef.current = value;
    setCopy(value);
  }

  // Ctrl (or Option on a Mac, where Ctrl-click is a right-click) is read
  // live so it can be pressed or released mid-drag.
  useEffect(() => {
    if (!active) return;
    const sync = (e: KeyboardEvent | MouseEvent) => updateCopy(e.ctrlKey || e.altKey);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("mousemove", sync);
    document.body.style.cursor = "grabbing";
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("mousemove", sync);
      document.body.style.cursor = "";
    };
  }, [active]);

  const logsQuery = useLogsRange(startDate, endDate);
  // Full history, not just "the active one" - a week can span more
  // than one goal now that goals have date ranges (see design
  // discussion). Each day resolves its OWN applicable goal below,
  // rather than the whole week assuming a single shared one.
  const goalsQuery = useGoalsList();
  const deleteLog = useDeleteLog();
  const createGroceryEntry = useCreateGroceryEntry();
  const copyLogs = useCopyLogs();

  function handleAddToGroceryList(log: Log) {
    if (log.item_id == null) return;
    createGroceryEntry.mutate(log.item_id);
  }

  function goToPreviousWeek() {
    setAnchorDate(addDays(startOfWeek(anchorDate), -1));
  }
  function goToNextWeek() {
    setAnchorDate(addDays(startOfWeek(anchorDate), 7));
  }

  if (logsQuery.isLoading || goalsQuery.isLoading) {
    return <div className="p-8 text-center text-gray-400 dark:text-gray-400">Loading...</div>;
  }
  if (logsQuery.isError) {
    return <div className="p-8 text-center text-red-500">Couldn't load logs: {(logsQuery.error as Error).message}</div>;
  }

  const logs = logsQuery.data ?? [];

  function handleDragStart(event: DragStartEvent) {
    setActive(event.active.data.current as DragPayload);
    const e = event.activatorEvent as MouseEvent;
    updateCopy(!!(e.ctrlKey || e.altKey));
  }

  function handleDragEnd(event: DragEndEvent) {
    const payload = event.active.data.current as DragPayload;
    const isCopy = copyRef.current;
    const touch = event.activatorEvent.type.startsWith("touch");
    setActive(null);
    updateCopy(false);

    const target = event.over?.data.current as { date: string; mealType: MealType | null } | undefined;
    if (!target) return;
    if (isSameSpot(payload, target.date, target.mealType) && !isCopy) return;

    // Touch has no modifier key, so let the dialog ask copy vs. move.
    if (touch) {
      setCopyDialog({ payload, initialDate: target.date, initialMeal: target.mealType ?? undefined });
      return;
    }
    const ids = logsForPayload(payload, logs).map((l) => l.id);
    if (ids.length === 0) return;
    copyLogs.mutate({
      log_ids: ids,
      target_date: target.date,
      meal_type: payload.kind === "day" ? undefined : target.mealType ?? undefined,
      move: !isCopy,
    }, { onSuccess: () => payload.kind === "logs" && setSelectedIds(new Set()) });
  }

  const selectedLogs = logs.filter((l) => selectedIds.has(l.id));
  const selection = {
    selecting,
    selected: selectedIds,
    selectedLogs,
    toggle: (id: number) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    setMany: (ids: number[], on: boolean) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
        return next;
      }),
  };

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
    <SelectionContext.Provider value={selection}>
    <div className="max-w-[2000px] mx-auto p-4">
      <div className="grid grid-cols-3 items-center mb-4">
        <div className="flex items-center gap-2 justify-self-start">
          <button onClick={goToPreviousWeek} className={NAV_BUTTON_CLASS} aria-label="Previous week">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowWeekPicker(true)} className={NAV_BUTTON_CLASS} aria-label="Pick a week">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={goToNextWeek} className={NAV_BUTTON_CLASS} aria-label="Next week">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center justify-self-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Week {weekNumber}</h1>
          <div className="text-xs text-gray-400 dark:text-gray-400">{formatWeekRangeLabel(startDate, endDate)}</div>
        </div>
        <div className="justify-self-end">
          <button
            onClick={() => (selecting ? exitSelecting() : setSelecting(true))}
            className={`h-9 px-3 rounded-lg text-sm font-medium shadow-sm flex items-center gap-1.5 ${
              selecting
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <CheckIcon className="w-4 h-4" />
            {selecting ? "Done" : "Select"}
          </button>
        </div>
      </div>

      <WeekMacroSummary weekTotals={weekTotals} targetTotals={targetTotals} />

      {/* overflow-x-auto stays as a safety net for genuinely narrow
          viewports, but DayColumn's min-width is now small enough that
          7 columns should fit without scrolling on ordinary desktop
          widths - see DayColumn's own comment. */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActive(null);
          updateCopy(false);
        }}
      >
      <DragContext.Provider value={{ active, copy }}>
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
            draggable
            onCopyTo={(payload) => setCopyDialog({ payload })}
          />
        ))}
      </div>
      </DragContext.Provider>
      <DragOverlay dropAnimation={null}>
        {active && <DragPreview payload={active} count={logsForPayload(active, logs).length} copy={copy} />}
      </DragOverlay>
      </DndContext>

      {copyDialog && (
        <CopyToDialog
          payload={copyDialog.payload}
          logIds={logsForPayload(copyDialog.payload, logs).map((l) => l.id)}
          initialDate={copyDialog.initialDate}
          initialMeal={copyDialog.initialMeal}
          initialMove={copyDialog.initialMove}
          onClose={() => setCopyDialog(null)}
          onDone={() => setSelectedIds(new Set())}
        />
      )}

      {selecting && selectedLogs.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-gray-900 dark:bg-gray-700 text-white shadow-xl pl-4 pr-2 py-2">
          <span className="text-sm font-medium mr-2">{selectedLogs.length} selected</span>
          <button
            onClick={() => setCopyDialog({ payload: { kind: "logs", logs: selectedLogs } })}
            className="px-3 py-1.5 rounded-full text-sm hover:bg-white/10 flex items-center gap-1.5"
          >
            <CopyIcon className="w-4 h-4" />
            Copy to...
          </button>
          <button
            onClick={() => setCopyDialog({ payload: { kind: "logs", logs: selectedLogs }, initialMove: true })}
            className="px-3 py-1.5 rounded-full text-sm hover:bg-white/10"
          >
            Move to...
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 rounded-full text-sm text-gray-300 hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      )}

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
          onCopyTo={(payload) => setCopyDialog({ payload })}
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
    </SelectionContext.Provider>
  );
}

function DragPreview({ payload, count, copy }: { payload: DragPayload; count: number; copy: boolean }) {
  const { title, subtitle } = describePayload(payload, count);
  return (
    <div className="relative w-56 cursor-grabbing">
      {payload.kind === "logs" && (
        <>
          <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 opacity-60" />
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 opacity-80" />
        </>
      )}
      {copy && payload.kind !== "logs" && <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-emerald-200 dark:bg-emerald-900" />}
      <div
        className={`relative rounded-xl border px-3 py-2 shadow-xl bg-white dark:bg-gray-800 ${
          copy ? "border-emerald-400" : "border-gray-200 dark:border-gray-600"
        }`}
      >
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</div>
        <div
          className={`absolute -top-2 -right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${
            copy ? "bg-emerald-500" : "bg-blue-500"
          }`}
        >
          {copy && <CopyIcon className="w-3 h-3" />}
          {copy ? "Copy" : "Move"}
        </div>
      </div>
    </div>
  );
}
