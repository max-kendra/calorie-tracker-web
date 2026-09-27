import { useState } from "react";
import type { Goal } from "@/api/types";
import { useGoalsList } from "@/api/hooks";
import { toIsoDate } from "@/lib/dates";
import { MACRO_COLORS } from "@/lib/colors";
import { GoalEditDialog } from "@/components/GoalEditDialog";

type Status = "current" | "past" | "future";

function statusOf(goal: Goal, todayIso: string): Status {
  if (goal.end_date != null && goal.end_date < todayIso) return "past";
  if (goal.start_date > todayIso) return "future";
  return "current";
}

const STATUS_LABELS: Record<Status, string> = { current: "Current", future: "Upcoming", past: "Past" };
const STATUS_ORDER: Status[] = ["current", "future", "past"];

export function GoalsPage() {
  const goalsQuery = useGoalsList();
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  if (goalsQuery.isLoading) {
    return <div className="p-8 text-center text-gray-400 dark:text-gray-500">Loading...</div>;
  }
  if (goalsQuery.isError) {
    return <div className="p-8 text-center text-red-500">Couldn't load goals: {(goalsQuery.error as Error).message}</div>;
  }

  const todayIso = toIsoDate(new Date());
  const goals = goalsQuery.data ?? [];
  const grouped: Record<Status, Goal[]> = { current: [], future: [], past: [] };
  for (const goal of goals) {
    grouped[statusOf(goal, todayIso)].push(goal);
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Goals</h1>
        <button
          onClick={() => {
            setEditingGoal(null);
            setShowDialog(true);
          }}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
        >
          + New goal
        </button>
      </div>

      {STATUS_ORDER.map((status) =>
        grouped[status].length === 0 ? null : (
          <div key={status} className="mb-4">
            <h2 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{STATUS_LABELS[status]}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              {grouped[status].map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => {
                    setEditingGoal(goal);
                    setShowDialog(true);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-baseline justify-between ${
                    status === "past" ? "opacity-60" : ""
                  }`}
                >
                  <span className="text-sm text-gray-800 dark:text-gray-100">
                    {goal.start_date} - {goal.end_date ?? "Ongoing"}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 space-x-1">
                    <span>{goal.kcal_target} Cal</span>
                    <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
                    <span style={{ color: MACRO_COLORS.protein }}>{goal.protein_g_target}P</span>
                    <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
                    <span style={{ color: MACRO_COLORS.fat }}>{goal.fat_g_target}F</span>
                    <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
                    <span style={{ color: MACRO_COLORS.carbs }}>{goal.carbs_g_target}C</span>
                    <span className="text-gray-300 dark:text-gray-600">{"\u00b7"}</span>
                    <span style={{ color: MACRO_COLORS.fiber }}>{goal.fiber_g_target}Fi</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ),
      )}

      {goals.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center text-gray-400 dark:text-gray-500 text-sm">No goals yet</div>
      )}

      {showDialog && <GoalEditDialog goal={editingGoal} onClose={() => setShowDialog(false)} />}
    </div>
  );
}