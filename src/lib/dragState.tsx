import { createContext } from "react";
import type { Log, MealType } from "@/api/types";
import { MEAL_LABELS, logDisplayName } from "@/lib/macros";
import { shortDateLabel, weekdayLabel } from "@/lib/dates";

export type DragPayload =
  | { kind: "log"; log: Log }
  | { kind: "meal"; date: string; mealType: MealType }
  | { kind: "day"; date: string };

export interface DragState {
  active: DragPayload | null;
  copy: boolean;
}

export const DragContext = createContext<DragState>({ active: null, copy: false });

export function logsForPayload(payload: DragPayload, logs: Log[]): Log[] {
  if (payload.kind === "log") return [payload.log];
  if (payload.kind === "meal") {
    return logs.filter((l) => l.date === payload.date && l.meal_type === payload.mealType);
  }
  return logs.filter((l) => l.date === payload.date);
}

export function isLogInDrag(payload: DragPayload | null, log: Log): boolean {
  if (!payload) return false;
  if (payload.kind === "log") return payload.log.id === log.id;
  if (payload.kind === "meal") return log.date === payload.date && log.meal_type === payload.mealType;
  return log.date === payload.date;
}

export function describePayload(payload: DragPayload, count: number): { title: string; subtitle: string } {
  const plural = `${count} ${count === 1 ? "item" : "items"}`;
  if (payload.kind === "log") return { title: logDisplayName(payload.log), subtitle: `${payload.log.kcal_logged} Cal` };
  if (payload.kind === "meal") {
    return { title: MEAL_LABELS[payload.mealType], subtitle: `${weekdayLabel(payload.date)} ${shortDateLabel(payload.date)} - ${plural}` };
  }
  return { title: `${weekdayLabel(payload.date)} ${shortDateLabel(payload.date)}`, subtitle: `Whole day - ${plural}` };
}

export function isSameSpot(payload: DragPayload, date: string, mealType: MealType | null): boolean {
  if (payload.kind === "day") return payload.date === date;
  if (payload.kind === "meal") return payload.date === date && payload.mealType === mealType;
  return payload.log.date === date && payload.log.meal_type === mealType;
}
